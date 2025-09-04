from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from django_tenants.utils import schema_context

from todo_management.models import TodoItem, TodoNotification


class Command(BaseCommand):
    help = "Generate due date reminders and overdue notifications for TODO items in tenant schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            type=str,
            default="demo",
            help="Tenant schema to run under (default: demo)",
        )
        parser.add_argument(
            "--hours",
            type=int,
            default=24,
            help="Avoid creating duplicate notifications within this many hours (default: 24)",
        )

    def handle(self, *args, **options):
        schema = options["schema"]
        window_hours = options["hours"]
        now = timezone.now()
        soon = now + timedelta(days=1)

        created_count = 0
        skipped_existing = 0

        with schema_context(schema):
            qs = TodoItem.objects.exclude(status="completed")
            due_soon_qs = qs.filter(due_date__gte=now, due_date__lte=soon)
            overdue_qs = qs.filter(due_date__lt=now)

            def _create_if_not_exists(todo, notification_type):
                nonlocal created_count, skipped_existing
                recent_exists = TodoNotification.objects.filter(
                    todo=todo,
                    notification_type=notification_type,
                    created_at__gte=now - timedelta(hours=window_hours),
                ).exists()
                if recent_exists:
                    skipped_existing += 1
                    return
                recipient = todo.assigned_to or todo.created_by
                if recipient:
                    TodoNotification.create_notification(
                        todo=todo, user=recipient, notification_type=notification_type
                    )
                    created_count += 1

            for todo in due_soon_qs:
                _create_if_not_exists(todo, "due_soon")
            for todo in overdue_qs:
                _create_if_not_exists(todo, "overdue")

        self.stdout.write(
            self.style.SUCCESS(
                f"Reminders created: {created_count}, skipped: {skipped_existing}, due_soon: {due_soon_qs.count()}, overdue: {overdue_qs.count()}"
            )
        )


