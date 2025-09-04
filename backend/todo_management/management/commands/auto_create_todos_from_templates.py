from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context

from todo_management.models import TodoTemplate


class Command(BaseCommand):
    help = "Auto-create TODO items from active templates in tenant schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            type=str,
            default="demo",
            help="Tenant schema to run under (default: demo)",
        )

    def handle(self, *args, **options):
        schema = options["schema"]
        created = 0
        checked = 0

        with schema_context(schema):
            templates = TodoTemplate.objects.filter(is_active=True, auto_create=True)
            for tpl in templates:
                checked += 1
                try:
                    if tpl.should_create_todo():
                        todo = tpl.create_todo(user=None)
                        if todo:
                            created += 1
                except Exception:
                    continue

        self.stdout.write(self.style.SUCCESS(f"Templates checked: {checked}, todos created: {created}"))


