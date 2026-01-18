from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable

from django.core.management.base import BaseCommand
from django_tenants.utils import get_tenant_model, schema_context

from billing.models import PricingTier
from buildings.models import Building
from office_finance.models import OfficeExpense, OfficeExpenseCategory
from office_finance.services import (
    PLATFORM_SUBSCRIPTION_CATEGORY_NAME,
    PLATFORM_SUBSCRIPTION_DESCRIPTION_TEMPLATE,
    PLATFORM_SUBSCRIPTION_TITLE_PREFIX,
)


DOC_PREFIX = "PLATFORM-SUBS"
CATEGORY_ICON = "Monitor"
CATEGORY_COLOR = "indigo"
CATEGORY_GROUP = "operational"
CATEGORY_TYPE = "platform"
CATEGORY_ORDER = 5


@dataclass
class SubscriptionCounts:
    total_apartments: int
    premium_apartments: int
    iot_apartments: int
    buildings_count: int


def _parse_month(value: str) -> date:
    parts = value.split("-")
    if len(parts) != 2:
        raise ValueError("Expected YYYY-MM")
    year, month = map(int, parts)
    return date(year, month, 1)


def _iter_months(start: date, end: date) -> Iterable[date]:
    current = date(start.year, start.month, 1)
    while current <= end:
        yield current
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)


def _format_amount(value: Decimal) -> str:
    return f"{value.quantize(Decimal('0.01'))}"


def _price_for_plan(plan_category: str, apartment_count: int) -> Decimal:
    if apartment_count <= 0:
        return Decimal("0.00")
    price_data = PricingTier.get_price_for_apartments(plan_category, apartment_count)
    if not price_data:
        raise ValueError(f"No pricing tier for {plan_category} with {apartment_count} apartments")
    price = price_data.get("price", Decimal("0.00"))
    if isinstance(price, Decimal):
        return price
    return Decimal(str(price))


def _get_platform_category() -> OfficeExpenseCategory:
    category, _ = OfficeExpenseCategory.objects.update_or_create(
        name=PLATFORM_SUBSCRIPTION_CATEGORY_NAME,
        defaults={
            "group_type": CATEGORY_GROUP,
            "category_type": CATEGORY_TYPE,
            "icon": CATEGORY_ICON,
            "color": CATEGORY_COLOR,
            "display_order": CATEGORY_ORDER,
            "is_system": True,
        },
    )
    return category


def _get_counts() -> SubscriptionCounts:
    total_apartments = 0
    premium_apartments = 0
    iot_apartments = 0
    buildings_count = 0

    for building in Building.objects.only("apartments_count", "premium_enabled", "iot_enabled"):
        count = int(building.apartments_count or 0)
        total_apartments += count
        buildings_count += 1
        if bool(building.premium_enabled):
            premium_apartments += count
        if bool(getattr(building, "iot_enabled", False)):
            iot_apartments += count

    return SubscriptionCounts(
        total_apartments=total_apartments,
        premium_apartments=premium_apartments,
        iot_apartments=iot_apartments,
        buildings_count=buildings_count,
    )


def _build_description(month_label: str, counts: SubscriptionCounts, web_cost: Decimal,
                       premium_cost: Decimal, iot_cost: Decimal) -> str:
    return PLATFORM_SUBSCRIPTION_DESCRIPTION_TEMPLATE.format(
        month_label=month_label,
        total_apartments=counts.total_apartments,
        premium_apartments=counts.premium_apartments,
        iot_apartments=counts.iot_apartments,
        web_cost=_format_amount(web_cost),
        premium_cost=_format_amount(premium_cost),
        iot_cost=_format_amount(iot_cost),
    )


class Command(BaseCommand):
    help = "Create monthly office expenses for platform subscription (web + premium + iot)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema",
            dest="schema_name",
            default=None,
            help="Limit to a specific tenant schema",
        )
        parser.add_argument(
            "--month",
            dest="month",
            default=None,
            help="Target month in YYYY-MM format",
        )
        parser.add_argument(
            "--from",
            dest="from_month",
            default=None,
            help="Start month in YYYY-MM format",
        )
        parser.add_argument(
            "--to",
            dest="to_month",
            default=None,
            help="End month in YYYY-MM format",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without writing",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Update existing auto entries for the month",
        )

    def handle(self, *args, **options):
        schema_name = options.get("schema_name")
        month_arg = options.get("month")
        from_month = options.get("from_month")
        to_month = options.get("to_month")
        dry_run = bool(options.get("dry_run"))
        force = bool(options.get("force"))

        if month_arg and (from_month or to_month):
            self.stdout.write(self.style.ERROR("Use --month OR --from/--to, not both."))
            return

        if month_arg:
            try:
                start = end = _parse_month(month_arg)
            except ValueError as exc:
                self.stdout.write(self.style.ERROR(f"Invalid --month: {exc}"))
                return
        else:
            today = date.today()
            try:
                start = _parse_month(from_month) if from_month else date(today.year, today.month, 1)
                end = _parse_month(to_month) if to_month else start
            except ValueError as exc:
                self.stdout.write(self.style.ERROR(f"Invalid --from/--to: {exc}"))
                return

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

                counts = _get_counts()
                if counts.total_apartments <= 0 and counts.premium_apartments <= 0 and counts.iot_apartments <= 0:
                    self.stdout.write(self.style.WARNING("  No billable apartments found, skipping."))
                    continue

                try:
                    web_cost = _price_for_plan("web", counts.total_apartments)
                    premium_cost = _price_for_plan("premium", counts.premium_apartments)
                    iot_cost = _price_for_plan("premium_iot", counts.iot_apartments)
                except ValueError as exc:
                    self.stdout.write(self.style.ERROR(f"  Pricing error: {exc}"))
                    continue

                total_cost = (web_cost + premium_cost + iot_cost).quantize(Decimal("0.01"))
                if total_cost <= 0:
                    self.stdout.write(self.style.WARNING("  Total subscription cost is 0, skipping."))
                    continue

                category = _get_platform_category()

                for target_month in _iter_months(start, end):
                    month_label = f"{target_month.month:02d}/{target_month.year}"
                    last_day = calendar.monthrange(target_month.year, target_month.month)[1]
                    expense_date = date(target_month.year, target_month.month, last_day)
                    document_number = f"{DOC_PREFIX}-{target_month.year}-{target_month.month:02d}"
                    title = f"{PLATFORM_SUBSCRIPTION_TITLE_PREFIX} {month_label}"
                    description = _build_description(
                        month_label=month_label,
                        counts=counts,
                        web_cost=web_cost,
                        premium_cost=premium_cost,
                        iot_cost=iot_cost,
                    )

                    existing = OfficeExpense.objects.filter(document_number=document_number).first()
                    if existing and not force:
                        self.stdout.write(self.style.WARNING(
                            f"  Exists: {document_number} ({existing.amount} EUR)"
                        ))
                        continue

                    if dry_run:
                        action = "Update" if existing else "Create"
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"  {action} {document_number}: {total_cost} EUR on {expense_date}"
                            )
                        )
                        continue

                    if existing:
                        existing.title = title
                        existing.description = description
                        existing.amount = total_cost
                        existing.date = expense_date
                        existing.category = category
                        existing.recurrence = "monthly"
                        existing.is_paid = True
                        existing.paid_date = expense_date
                        existing.payment_method = "bank_transfer"
                        existing.supplier_name = "Digital Concierge"
                        existing.notes = (
                            f"Auto-sync {document_number}. Buildings={counts.buildings_count} "
                            f"Apts={counts.total_apartments} Premium={counts.premium_apartments} IoT={counts.iot_apartments}."
                        )
                        existing.save()
                        self.stdout.write(self.style.SUCCESS(
                            f"  Updated {document_number}: {total_cost} EUR"
                        ))
                        continue

                    OfficeExpense.objects.create(
                        title=title,
                        description=description,
                        amount=total_cost,
                        date=expense_date,
                        category=category,
                        recurrence="monthly",
                        is_paid=True,
                        paid_date=expense_date,
                        payment_method="bank_transfer",
                        supplier_name="Digital Concierge",
                        document_number=document_number,
                        notes=(
                            f"Auto-sync {document_number}. Buildings={counts.buildings_count} "
                            f"Apts={counts.total_apartments} Premium={counts.premium_apartments} IoT={counts.iot_apartments}."
                        ),
                    )
                    self.stdout.write(self.style.SUCCESS(
                        f"  Created {document_number}: {total_cost} EUR"
                    ))
