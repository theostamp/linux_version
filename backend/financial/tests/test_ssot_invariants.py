"""
SSoT Contract Tests

These tests validate the Financial Data Contract invariants using the canonical
Expense ledger and MonthlyBalanceService snapshots.
"""

from decimal import Decimal
from datetime import date

from django_tenants.test.cases import TenantTestCase

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Expense
from financial.monthly_balance_service import MonthlyBalanceService
from financial.services import FinancialDashboardService


class SSoTContractInvariantsTest(TenantTestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name="SSoT Contract Building",
            address="Contract Address",
            financial_system_start_date=date(2025, 1, 1),
            management_fee_per_apartment=Decimal("0.00"),
        )

        Apartment.objects.create(
            building=self.building,
            number="A1",
            floor=1,
            participation_mills=500,
        )
        Apartment.objects.create(
            building=self.building,
            number="A2",
            floor=2,
            participation_mills=500,
        )

        Expense.objects.create(
            building=self.building,
            title="Cleaning",
            amount=Decimal("100.00"),
            date=date(2025, 1, 10),
            category="cleaning",
        )
        Expense.objects.create(
            building=self.building,
            title="Management Fees",
            amount=Decimal("20.00"),
            date=date(2025, 1, 10),
            category="management_fees",
        )
        Expense.objects.create(
            building=self.building,
            title="Reserve Fund",
            amount=Decimal("40.00"),
            date=date(2025, 1, 10),
            category="reserve_fund",
        )

    def test_monthly_balance_contract_fields(self):
        service = MonthlyBalanceService(self.building)
        mb = service.create_or_update_monthly_balance(2025, 1, recalculate=True)

        self.assertEqual(mb.total_expenses, Decimal("100.00"))
        self.assertEqual(mb.management_fees, Decimal("20.00"))
        self.assertEqual(mb.reserve_fund_amount, Decimal("40.00"))
        self.assertEqual(mb.scheduled_maintenance_amount, Decimal("0.00"))
        self.assertEqual(mb.previous_obligations, Decimal("0.00"))
        self.assertEqual(mb.total_obligations, Decimal("160.00"))
        self.assertEqual(mb.total_payments, Decimal("0.00"))
        self.assertEqual(mb.carry_forward, Decimal("160.00"))

    def test_dashboard_summary_matches_monthly_balance(self):
        service = MonthlyBalanceService(self.building)
        mb = service.create_or_update_monthly_balance(2025, 1, recalculate=True)

        dashboard = FinancialDashboardService(self.building.id)
        summary = dashboard.get_summary(month="2025-01")

        self.assertTrue(summary.get("uses_monthly_balance_snapshot"))
        self.assertEqual(Decimal(str(summary["total_expenses_month"])), mb.total_expenses)
        self.assertEqual(Decimal(str(summary["total_management_cost"])), mb.management_fees)
        self.assertEqual(Decimal(str(summary["reserve_fund_contribution"])), mb.reserve_fund_amount)
        self.assertEqual(Decimal(str(summary["previous_obligations"])), mb.previous_obligations)
        self.assertEqual(Decimal(str(summary["current_month_expenses"])), mb.total_obligations)
