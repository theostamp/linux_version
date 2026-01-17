from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.dateparse import parse_date

from financial.models import Expense
from financial.signals import sync_office_income_from_management_fees


class Command(BaseCommand):
    help = "Backfill OfficeIncome entries from management_fees expenses."

    def add_arguments(self, parser):
        parser.add_argument(
            "--building-id",
            type=int,
            default=None,
            help="Limit to a specific building ID",
        )
        parser.add_argument(
            "--date-from",
            dest="date_from",
            default=None,
            help="Start date (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--date-to",
            dest="date_to",
            default=None,
            help="End date (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many records would be synced without writing",
        )

    def handle(self, *args, **options):
        building_id = options.get("building_id")
        date_from_raw = options.get("date_from")
        date_to_raw = options.get("date_to")
        dry_run = bool(options.get("dry_run"))

        queryset = Expense.objects.filter(category="management_fees")

        if building_id:
            queryset = queryset.filter(building_id=building_id)

        if date_from_raw:
            date_from = parse_date(date_from_raw)
            if not date_from:
                self.stdout.write(self.style.ERROR(f"Invalid --date-from: {date_from_raw}"))
                return
            queryset = queryset.filter(date__gte=date_from)

        if date_to_raw:
            date_to = parse_date(date_to_raw)
            if not date_to:
                self.stdout.write(self.style.ERROR(f"Invalid --date-to: {date_to_raw}"))
                return
            queryset = queryset.filter(date__lte=date_to)

        total = queryset.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No management_fees expenses matched filters."))
            return

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Dry run: {total} expenses would be synced."))
            return

        ok_count = 0
        fail_count = 0

        for expense in queryset.iterator():
            try:
                with transaction.atomic():
                    sync_office_income_from_management_fees(
                        sender=Expense,
                        instance=expense,
                        created=False,
                        raise_errors=True,
                    )
                ok_count += 1
            except Exception as exc:
                fail_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"ERROR Expense {expense.id} (building {expense.building_id}): {exc}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Done. OK={ok_count} Failed={fail_count} Total={total}"))
