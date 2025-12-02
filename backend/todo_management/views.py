from typing import Any

from django.db.models import QuerySet
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from core.permissions import IsManagerOrSuperuser
from core.utils import filter_queryset_by_user_and_building

from .models import TodoCategory, TodoItem, TodoTemplate, TodoNotification
from .serializers import (
    TodoCategorySerializer,
    TodoItemSerializer,
    TodoTemplateSerializer,
    TodoNotificationSerializer,
)

class TodoCategoryViewSet(viewsets.ModelViewSet):
    queryset = TodoCategory.objects.all().order_by("name")
    serializer_class = TodoCategorySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self) -> QuerySet[TodoCategory]:
        qs = super().get_queryset()
        return filter_queryset_by_user_and_building(self.request, qs)

class TodoItemViewSet(viewsets.ModelViewSet):
    queryset = TodoItem.objects.select_related("category", "building", "apartment", "created_by", "assigned_to").all()
    serializer_class = TodoItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "tags"]
    ordering_fields = ["due_date", "priority", "created_at", "updated_at"]
    ordering = ["-priority", "due_date", "-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "pending_count"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self) -> QuerySet[TodoItem]:
        qs = super().get_queryset()
        qs = filter_queryset_by_user_and_building(self.request, qs)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        category_param = self.request.query_params.get("category")
        if category_param:
            qs = qs.filter(category_id=category_param)

        priority_param = self.request.query_params.get("priority")
        if priority_param:
            qs = qs.filter(priority=priority_param)

        assigned_to_param = self.request.query_params.get("assigned_to")
        if assigned_to_param:
            qs = qs.filter(assigned_to_id=assigned_to_param)

        tag_param = self.request.query_params.get("tag")
        if tag_param:
            # Filter JSON array field 'tags' containing the given tag
            qs = qs.filter(tags__contains=[tag_param])

        overdue_param = self.request.query_params.get("overdue")
        if overdue_param in {"1", "true", "True"}:
            from django.utils import timezone

            qs = qs.filter(due_date__lt=timezone.now()).exclude(status="completed")

        due_soon_param = self.request.query_params.get("due_soon")
        if due_soon_param in {"1", "true", "True"}:
            from django.utils import timezone
            from datetime import timedelta

            now = timezone.now()
            soon = now + timedelta(days=1)
            qs = qs.filter(due_date__gte=now, due_date__lte=soon).exclude(status="completed")

        return qs

    @action(detail=False, methods=["get"], url_path="pending-count")
    def pending_count(self, request):
        qs = self.get_queryset().filter(status="pending")
        return Response({"count": qs.count()})

    @action(detail=False, methods=["post"], url_path="generate-reminders")
    def generate_reminders(self, request):
        """Δημιουργεί υπενθυμίσεις για due_soon και overdue TODOs για το επιλεγμένο κτίριο.
        Απαιτείται authenticated χρήστης. Επιτρέπεται μόνο σε διαχειριστές/superusers.
        """
        # Permissions: μόνο managers/superusers
        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        soon = now + timedelta(days=1)

        qs = self.get_queryset().exclude(status="completed")
        due_soon_qs = qs.filter(due_date__gte=now, due_date__lte=soon)
        overdue_qs = qs.filter(due_date__lt=now)

        created_count = 0
        skipped_existing = 0

        def _create_if_not_exists(todo, notification_type):
            nonlocal created_count, skipped_existing
            # Αποφυγή διπλοτύπων μέσα στο τελευταίο 24ωρο για ίδιο todo/type
            recent_exists = TodoNotification.objects.filter(
                todo=todo, notification_type=notification_type, created_at__gte=now - timedelta(hours=24)
            ).exists()
            if recent_exists:
                skipped_existing += 1
                return
            recipient = todo.assigned_to or todo.created_by
            if recipient:
                TodoNotification.create_notification(todo=todo, user=recipient, notification_type=notification_type)
                created_count += 1

        for todo in due_soon_qs:
            _create_if_not_exists(todo, "due_soon")
        for todo in overdue_qs:
            _create_if_not_exists(todo, "overdue")

        return Response({
            "created": created_count,
            "skipped": skipped_existing,
            "due_soon": due_soon_qs.count(),
            "overdue": overdue_qs.count(),
        })

    @action(detail=False, methods=["post"], url_path="sync-financial-overdues")
    def sync_financial_overdues(self, request):
        """Δημιουργεί TODOs για διαμερίσματα με αρνητικό υπόλοιπο (οφειλές).
        Επιτρέπεται μόνο σε διαχειριστές/superusers.
        Απαιτείται παράμετρος building.
        """
        # Permissions
        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        building_id = request.query_params.get("building")
        if not building_id:
            return Response({"detail": "Missing 'building' query parameter"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            building_id_int = int(building_id)
        except ValueError:
            return Response({"detail": "Invalid 'building' id"}, status=status.HTTP_400_BAD_REQUEST)

        from .services import sync_financial_overdues

        result = sync_financial_overdues(building_id=building_id_int, actor=request.user)
        return Response(result)

    @action(detail=False, methods=["post"], url_path="sync-maintenance-schedule")
    def sync_maintenance_schedule(self, request):
        """Δημιουργεί TODOs από προγραμματισμένες συντηρήσεις (ScheduledMaintenance).
        Επιτρέπεται μόνο σε διαχειριστές/superusers.
        Απαιτείται παράμετρος building.
        """
        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        building_id = request.query_params.get("building")
        if not building_id:
            return Response({"detail": "Missing 'building' query parameter"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            building_id_int = int(building_id)
        except ValueError:
            return Response({"detail": "Invalid 'building' id"}, status=status.HTTP_400_BAD_REQUEST)

        from .services import sync_maintenance_schedule

        result = sync_maintenance_schedule(building_id=building_id_int, actor=request.user)
        return Response(result)

    def perform_create(self, serializer):
        # Ensure creator is always the current user
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        previous_status = instance.status
        updated = serializer.save()
        # If status changed to completed, set completed_at timestamp if missing
        if previous_status != updated.status and updated.status == "completed" and not updated.completed_at:
            from django.utils import timezone

            updated.completed_at = timezone.now()
            updated.save(update_fields=["completed_at"])


class TodoTemplateViewSet(viewsets.ModelViewSet):
    queryset = TodoTemplate.objects.select_related("category", "building").all()
    serializer_class = TodoTemplateSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsManagerOrSuperuser()]

    def get_queryset(self) -> QuerySet[TodoTemplate]:
        qs = super().get_queryset()
        return filter_queryset_by_user_and_building(self.request, qs)

    @action(detail=False, methods=["post"], url_path="auto-create")
    def auto_create(self, request):
        """Δημιουργεί TODOs από ενεργά templates που είναι due για δημιουργία.
        Επιτρέπεται μόνο σε διαχειριστές/superusers.
        """
        if not (getattr(request.user, "is_staff", False) or getattr(request.user, "is_superuser", False)):
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        created = 0
        checked = 0
        templates = self.get_queryset().filter(is_active=True, auto_create=True)
        for tpl in templates:
            checked += 1
            try:
                if tpl.should_create_todo():
                    todo = tpl.create_todo(user=request.user)
                    if todo:
                        created += 1
            except Exception:
                # Σε περίπτωση σφάλματος, συνεχίζουμε με τα επόμενα templates
                continue

        return Response({"created": created, "checked": checked})


class TodoNotificationViewSet(viewsets.ModelViewSet):
    queryset = TodoNotification.objects.select_related("todo", "user").all()
    serializer_class = TodoNotificationSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self) -> QuerySet[TodoNotification]:
        qs = super().get_queryset()
        # Limit to current user by default
        qs = qs.filter(user=self.request.user)
        qs = filter_queryset_by_user_and_building(self.request, qs, building_field="todo__building")

        is_read_param = self.request.query_params.get("is_read")
        if is_read_param in {"0", "false", "False"}:
            qs = qs.filter(is_read=False)
        elif is_read_param in {"1", "true", "True"}:
            qs = qs.filter(is_read=True)
        return qs

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

