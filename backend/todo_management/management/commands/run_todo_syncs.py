from django.core.management.base import BaseCommand, CommandParser
from django_tenants.utils import schema_context

from todo_management.services import sync_financial_overdues, sync_maintenance_schedule
from time import perf_counter
import json


class Command(BaseCommand):
    help = "Run TODO sync jobs for a given building and tenant schema"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("building_id", type=int, help="Target building id")
        parser.add_argument(
            "--schema",
            default="demo",
            help="Tenant schema (default: demo)",
        )
        parser.add_argument(
            "--skip-financial",
            action="store_true",
            help="Skip financial overdues sync",
        )
        parser.add_argument(
            "--skip-maintenance",
            action="store_true",
            help="Skip maintenance schedule sync",
        )

    def handle(self, *args, **options):
        building_id = options["building_id"]
        schema = options["schema"]
        skip_financial = options["skip_financial"]
        skip_maintenance = options["skip_maintenance"]

        log = {
            "schema": schema,
            "building_id": building_id,
            "sections": {},
        }
        started = perf_counter()

        # Actor is None here; service will pick a sensible default superuser/staff
        with schema_context(schema):
            if not skip_financial:
                t0 = perf_counter()
                result = sync_financial_overdues(building_id=building_id, actor=None)
                log["sections"]["financial"] = {"result": result, "seconds": round(perf_counter() - t0, 3)}
            if not skip_maintenance:
                t0 = perf_counter()
                result = sync_maintenance_schedule(building_id=building_id, actor=None)
                log["sections"]["maintenance"] = {"result": result, "seconds": round(perf_counter() - t0, 3)}

        log["total_seconds"] = round(perf_counter() - started, 3)
        self.stdout.write(self.style.SUCCESS(json.dumps(log, ensure_ascii=False)))


