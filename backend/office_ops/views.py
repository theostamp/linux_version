from __future__ import annotations

from datetime import date

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection
from django.db.models import Count, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from buildings.models import Building

from .models import BulkJob, BulkJobItem, BulkJobItemStatus, BulkTemplate
from .permissions import IsOfficeOpsStaff
from .serializers import (
    BulkJobCreateSerializer,
    BulkJobSerializer,
    BulkRetrySerializer,
    BulkTemplateSerializer,
)
from .services import build_dry_run, queue_job_execution


class BulkOpsFeatureFlagMixin:
    def initial(self, request, *args, **kwargs):
        if not getattr(settings, "ENABLE_BULK_OPS", False):
            raise PermissionDenied("Bulk Ops is disabled by feature flag.")
        return super().initial(request, *args, **kwargs)


class BulkTemplateViewSet(BulkOpsFeatureFlagMixin, viewsets.ModelViewSet):
    queryset = BulkTemplate.objects.select_related("created_by").all()
    serializer_class = BulkTemplateSerializer
    permission_classes = [IsAuthenticated, IsOfficeOpsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["operation_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["operation_type", "name", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class BulkJobViewSet(
    BulkOpsFeatureFlagMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsOfficeOpsStaff]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["operation_type", "status", "building", "month"]
    ordering_fields = ["created_at", "updated_at", "finished_at"]

    def get_queryset(self):
        queryset = BulkJob.objects.select_related("building", "source_template", "requested_by").annotate(
            total_items_count=Count("items", distinct=True),
            validated_items_count=Count(
                "items",
                filter=Q(items__status=BulkJobItemStatus.VALIDATED),
                distinct=True,
            ),
            executed_items_count=Count(
                "items",
                filter=Q(items__status=BulkJobItemStatus.EXECUTED),
                distinct=True,
            ),
            failed_items_count=Count(
                "items",
                filter=Q(items__status=BulkJobItemStatus.FAILED),
                distinct=True,
            ),
            skipped_items_count=Count(
                "items",
                filter=Q(items__status=BulkJobItemStatus.SKIPPED),
                distinct=True,
            ),
        )
        if self.action == "retrieve":
            return queryset.prefetch_related("items", "errors")
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_details"] = self.action != "list"
        return context

    def get_serializer_class(self):
        if self.action == "create":
            return BulkJobCreateSerializer
        if self.action == "retry":
            return BulkRetrySerializer
        return BulkJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data

        month = (validated.get("month") or "").strip()
        if not month:
            month = date.today().strftime("%Y-%m")

        operation_type = validated["operation_type"]
        building_id = validated.get("building_id")
        template = validated.get("template_id")
        auto_dry_run = validated.get("auto_dry_run", True)

        raw_key = (validated.get("idempotency_key") or "").strip()
        idempotency_key = raw_key or (
            f"office-ops:{operation_type}:{building_id or 'all'}:{month}:{date.today().isoformat()}"
        )

        existing = BulkJob.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return Response(
                BulkJobSerializer(existing, context=self.get_serializer_context()).data,
                status=status.HTTP_200_OK,
            )

        building = None
        if building_id:
            building = Building.objects.filter(id=building_id).first()
            if not building:
                raise ValidationError({"building_id": "Building not found."})

        options = validated.get("options") or {}
        if template:
            options = {
                **(template.config or {}),
                **options,
            }

        job = BulkJob.objects.create(
            operation_type=operation_type,
            building=building,
            month=month,
            options=options,
            source_template=template,
            requested_by=request.user,
            idempotency_key=idempotency_key,
        )

        if auto_dry_run:
            try:
                build_dry_run(job)
            except DjangoValidationError as exc:
                raise ValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))

        return Response(
            BulkJobSerializer(job, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="dry-run")
    def dry_run(self, request, pk=None):
        job = self.get_object()
        try:
            build_dry_run(job)
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))
        return Response(BulkJobSerializer(job, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post"], url_path="execute")
    def execute(self, request, pk=None):
        job = self.get_object()
        try:
            task_id = queue_job_execution(
                job,
                schema_name=connection.schema_name,
                mode="execute",
            )
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))

        job.refresh_from_db()
        status_code = status.HTTP_200_OK if task_id is None else status.HTTP_202_ACCEPTED
        return Response(
            BulkJobSerializer(job, context=self.get_serializer_context()).data,
            status=status_code,
        )

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        job = self.get_object()
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        item_ids = serializer.validated_data.get("item_ids")
        item_ids_as_str = [str(item_id) for item_id in item_ids] if item_ids else None

        try:
            task_id = queue_job_execution(
                job,
                schema_name=connection.schema_name,
                mode="retry",
                item_ids=item_ids_as_str,
            )
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "message_dict", {"detail": str(exc)}))

        job.refresh_from_db()
        status_code = status.HTTP_200_OK if task_id is None else status.HTTP_202_ACCEPTED
        return Response(
            BulkJobSerializer(job, context=self.get_serializer_context()).data,
            status=status_code,
        )

    @action(detail=True, methods=["get"], url_path="items-summary")
    def items_summary(self, request, pk=None):
        job = self.get_object()
        qs = BulkJobItem.objects.filter(job=job)

        return Response(
            {
                "total": qs.count(),
                "validated": qs.filter(status="validated").count(),
                "executed": qs.filter(status="executed").count(),
                "failed": qs.filter(status="failed").count(),
                "skipped": qs.filter(status="skipped").count(),
            }
        )
