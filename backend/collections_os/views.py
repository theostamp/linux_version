from __future__ import annotations

from datetime import date

from django.conf import settings
from django.db import connection
from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apartments.models import Apartment
from buildings.mixins import BuildingContextMixin

from .models import (
    DunningEvent,
    DunningEventStatus,
    DunningPolicy,
    DunningRun,
    DunningRunSource,
    DunningRunStatus,
    PromiseToPay,
)
from .permissions import IsCollectionsOperator
from .serializers import (
    DunningEventSerializer,
    DunningPolicySerializer,
    DunningRunRetrySerializer,
    DunningRunSerializer,
    DunningRunTriggerSerializer,
    PromiseToPaySerializer,
)
from .services import _resolve_recipient, get_candidates_for_policy, initialize_run_events, queue_run_dispatch


class CollectionsFeatureFlagMixin:
    """Block access unless Collections OS flag is enabled."""

    def initial(self, request, *args, **kwargs):
        if not getattr(settings, "ENABLE_COLLECTIONS_OS", False):
            raise PermissionDenied("Collections OS is disabled by feature flag.")
        return super().initial(request, *args, **kwargs)


class DunningPolicyViewSet(CollectionsFeatureFlagMixin, BuildingContextMixin, viewsets.ModelViewSet):
    queryset = DunningPolicy.objects.select_related("building", "created_by").all()
    serializer_class = DunningPolicySerializer
    permission_classes = [IsAuthenticated, IsCollectionsOperator]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "channel", "escalation_level"]
    search_fields = ["name", "template_slug"]
    ordering_fields = ["min_days_overdue", "max_days_overdue", "escalation_level", "created_at"]

    building_required = True
    building_field_name = "building"
    auto_filter_by_building = True

    def perform_create(self, serializer):
        building = self.get_building_context()
        serializer.save(building_id=building.id, created_by=self.request.user)


class DunningRunViewSet(CollectionsFeatureFlagMixin, BuildingContextMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DunningRun.objects.select_related("building", "policy", "triggered_by").all()
    serializer_class = DunningRunSerializer
    permission_classes = [IsAuthenticated, IsCollectionsOperator]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["policy", "source", "status", "month"]
    ordering_fields = ["started_at", "finished_at", "updated_at"]

    building_required = True
    building_field_name = "building"
    auto_filter_by_building = True

    def _validate_policy_scope(self, policy: DunningPolicy, building_id: int):
        if policy.building_id != building_id:
            raise ValidationError({"policy_id": "Policy does not belong to selected building."})

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request):
        building = self.get_building_context()
        serializer = DunningRunTriggerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        policy = serializer.validated_data["policy_id"]
        self._validate_policy_scope(policy, building.id)

        month = serializer.validated_data.get("month") or ""
        candidates = get_candidates_for_policy(policy, month=month or None)

        apartment_ids = [item.get("apartment_id") for item in candidates if item.get("apartment_id")]
        apartments = Apartment.objects.in_bulk(apartment_ids)

        missing_contacts = 0
        for item in candidates:
            apartment = apartments.get(item.get("apartment_id"))
            if apartment and not _resolve_recipient(apartment, policy.channel):
                missing_contacts += 1

        return Response(
            {
                "policy_id": policy.id,
                "policy_name": policy.name,
                "month": month,
                "channel": policy.channel,
                "total_candidates": len(candidates),
                "missing_contacts": missing_contacts,
                "queued_estimate": max(0, len(candidates) - missing_contacts),
                "sample_items": candidates[:50],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="trigger")
    def trigger(self, request):
        building = self.get_building_context()
        serializer = DunningRunTriggerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        policy = serializer.validated_data["policy_id"]
        self._validate_policy_scope(policy, building.id)

        month = (serializer.validated_data.get("month") or "").strip()
        raw_key = (serializer.validated_data.get("idempotency_key") or "").strip()
        idempotency_key = (
            raw_key
            or f"collections:manual:{building.id}:{policy.id}:{month or 'all'}:{date.today().isoformat()}"
        )

        existing_run = DunningRun.objects.filter(building_id=building.id, idempotency_key=idempotency_key).first()
        if existing_run:
            return Response(
                {
                    "idempotent": True,
                    "run": DunningRunSerializer(existing_run).data,
                },
                status=status.HTTP_200_OK,
            )

        run = DunningRun.objects.create(
            building_id=building.id,
            policy=policy,
            source=DunningRunSource.MANUAL,
            status=DunningRunStatus.RUNNING,
            month=month,
            idempotency_key=idempotency_key,
            triggered_by=request.user,
            metadata={"trigger_mode": "manual_api"},
        )

        initialize_run_events(run)
        try:
            task_id = queue_run_dispatch(run, schema_name=connection.schema_name)
        except Exception as exc:
            raise ValidationError({"detail": str(exc)})
        run.refresh_from_db()

        return Response(
            {
                "idempotent": False,
                "task_id": task_id,
                "run": DunningRunSerializer(run).data,
            },
            status=status.HTTP_202_ACCEPTED if task_id else status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        building = self.get_building_context()
        source_run = self.get_object()

        serializer = DunningRunRetrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        retry_apartment_ids = list(
            source_run.events.filter(
                status__in=[DunningEventStatus.FAILED, DunningEventStatus.SKIPPED]
            )
            .values_list("apartment_id", flat=True)
            .distinct()
        )
        if not retry_apartment_ids:
            raise ValidationError({"detail": "No failed or skipped events available for retry."})

        raw_key = (serializer.validated_data.get("idempotency_key") or "").strip()
        idempotency_key = (
            raw_key
            or f"collections:retry:{building.id}:{source_run.id}:{timezone.now().strftime('%Y%m%d%H%M%S')}"
        )

        existing_run = DunningRun.objects.filter(building_id=building.id, idempotency_key=idempotency_key).first()
        if existing_run:
            return Response(
                {
                    "idempotent": True,
                    "run": DunningRunSerializer(existing_run).data,
                },
                status=status.HTTP_200_OK,
            )

        retry_run = DunningRun.objects.create(
            building_id=building.id,
            policy=source_run.policy,
            source=DunningRunSource.RETRY,
            status=DunningRunStatus.RUNNING,
            month=source_run.month,
            idempotency_key=idempotency_key,
            triggered_by=request.user,
            metadata={
                "retry_of_run_id": str(source_run.id),
                "retry_apartments": len(retry_apartment_ids),
            },
        )

        initialize_run_events(retry_run, apartment_ids=retry_apartment_ids)
        try:
            task_id = queue_run_dispatch(retry_run, schema_name=connection.schema_name)
        except Exception as exc:
            raise ValidationError({"detail": str(exc)})
        retry_run.refresh_from_db()

        return Response(
            {
                "idempotent": False,
                "task_id": task_id,
                "run": DunningRunSerializer(retry_run).data,
            },
            status=status.HTTP_202_ACCEPTED if task_id else status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="queue-stats")
    def queue_stats(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        run_counts = {
            item["status"]: item["total"]
            for item in queryset.values("status").annotate(total=Count("id"))
        }

        event_counts = {
            item["status"]: item["total"]
            for item in DunningEvent.objects.filter(run__in=queryset)
            .values("status")
            .annotate(total=Count("id"))
        }

        return Response(
            {
                "runs": run_counts,
                "events": event_counts,
            }
        )


class DunningEventViewSet(CollectionsFeatureFlagMixin, BuildingContextMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DunningEvent.objects.select_related("run", "policy", "building", "apartment").all()
    serializer_class = DunningEventSerializer
    permission_classes = [IsAuthenticated, IsCollectionsOperator]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["run", "policy", "status", "channel", "apartment"]
    ordering_fields = ["created_at", "sent_at", "days_overdue", "amount_due"]

    building_required = True
    building_field_name = "building"
    auto_filter_by_building = True


class PromiseToPayViewSet(CollectionsFeatureFlagMixin, BuildingContextMixin, viewsets.ModelViewSet):
    queryset = PromiseToPay.objects.select_related(
        "building", "apartment", "resident_user", "source_event", "created_by"
    ).all()
    serializer_class = PromiseToPaySerializer
    permission_classes = [IsAuthenticated, IsCollectionsOperator]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["apartment", "status", "promised_date"]
    ordering_fields = ["promised_date", "created_at", "updated_at", "amount"]

    building_required = True
    building_field_name = "building"
    auto_filter_by_building = True

    def perform_create(self, serializer):
        building = self.get_building_context()
        serializer.save(building_id=building.id, created_by=self.request.user)
