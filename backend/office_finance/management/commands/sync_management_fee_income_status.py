from __future__ import annotations

import calendar
from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Tuple

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from django_tenants.utils import get_tenant_model, schema_context

from financial.models import Payment, Transaction
from financial.transaction_types import TransactionType
from office_finance.models import OfficeIncome


MANAGEMENT_FEE_CATEGORY_TYPE = "management_fee_monthly"
INVOICE_PREFIX = "MGMT-EXP-"


def _month_end(target: date) -> date:
    last_day = calendar.monthrange(target.year, target.month)[1]
    return date(target.year, target.month, last_day)


def _charges_through(building_id: int, cutoff: date) -> Decimal:
    cutoff_dt = timezone.make_aware(datetime.combine(cutoff, datetime.max.time()))
    total = Transaction.objects.filter(
        building_id=building_id,
        type__in=TransactionType.get_charge_types(),
        date__lte=cutoff_dt,
    ).aggregate(total=Sum("amount"))["total"]
    return total or Decimal("0.00")


def _payments_through(building_id: int, cutoff: date) -> Decimal:
    total = Payment.objects.filter(
        apartment__building_id=building_id,
        date__lte=cutoff,
    ).aggregate(total=Sum("amount"))["total"]
    return total or Decimal("0.00")


class Command(BaseCommand):
    help = "Sync management fee office incomes to received when months are fully paid."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            dest="schema_name",
            default=None,
            help="Limit to a specific tenant schema",
        )
        parser.add_argument(
            "--building-id",
            dest="building_id",
            type=int,
            default=None,
            help="Limit to a specific building",
        )
        parser.add_argument(
            "--as-of",
            dest="as_of",
            default=None,
            help="Evaluate payments up to this date (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without writing",
        )

    def handle(self, *args, **options):
        schema_name = options.get("schema_name")
        building_id = options.get("building_id")
        as_of_raw = options.get("as_of")
        dry_run = bool(options.get("dry_run"))

        as_of_date = timezone.now().date()
        if as_of_raw:
            parsed = parse_date(as_of_raw)
            if not parsed:
                self.stdout.write(self.style.ERROR(f"Invalid --as-of: {as_of_raw}"))
                return
            as_of_date = parsed

        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.exclude(schema_name="public")
        if schema_name:
            tenants = tenants.filter(schema_name=schema_name)

        if not tenants.exists():
            self.stdout.write(self.style.WARNING("No tenants matched the filters."))
            return

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                self.stdout.write("")
                self.stdout.write(f"Tenant: {tenant.schema_name}")

                incomes = OfficeIncome.objects.filter(
                    status="pending",
                    category__category_type=MANAGEMENT_FEE_CATEGORY_TYPE,
                    building__isnull=False,
                ).select_related("building", "category").order_by("date", "id")

                if building_id:
                    incomes = incomes.filter(building_id=building_id)

                if not incomes.exists():
                    self.stdout.write("  No pending management fee incomes.")
                    continue

                payments_cache: Dict[int, Decimal] = {}
                charges_cache: Dict[Tuple[int, date], Decimal] = {}

                updated = 0
                skipped = 0

                for income in incomes:
                    building = income.building
                    if not building:
                        skipped += 1
                        continue

                    month_end = _month_end(income.date)
                    if month_end > as_of_date:
                        skipped += 1
                        continue

                    if building.id not in payments_cache:
                        payments_cache[building.id] = _payments_through(building.id, as_of_date)

                    charges_key = (building.id, month_end)
                    if charges_key not in charges_cache:
                        charges_cache[charges_key] = _charges_through(building.id, month_end)

                    total_payments = payments_cache[building.id]
                    total_charges = charges_cache[charges_key]

                    if total_charges <= 0:
                        skipped += 1
                        continue

                    if total_payments < total_charges:
                        skipped += 1
                        continue

                    if dry_run:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"  Would mark received: income {income.id} for {month_end}"
                            )
                        )
                        updated += 1
                        continue

                    income.status = "received"
                    if not income.received_date:
                        income.received_date = as_of_date
                    income.save(update_fields=["status", "received_date", "updated_at"])
                    updated += 1

                self.stdout.write(
                    self.style.SUCCESS(f"  Updated: {updated} | Skipped: {skipped}")
                )
