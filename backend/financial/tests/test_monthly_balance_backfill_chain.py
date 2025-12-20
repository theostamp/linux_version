"""
Regression test: MonthlyBalance chain backfill for correct month-to-month carryover.

Scenario:
- There are expenses in January.
- MonthlyBalance records are missing (simulating old data imports / disabled signals / gaps).
- When requesting a snapshot for February via the dashboard service, the system must
  backfill January MonthlyBalance and use its carry_forward as February.previous_obligations.
"""

from decimal import Decimal
from datetime import date

from django_tenants.test.cases import TenantTestCase

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, MonthlyBalance
from financial.services import FinancialDashboardService


class MonthlyBalanceBackfillChainTest(TenantTestCase):
    def setUp(self):
        self.building = Building.objects.create(
            name="Backfill Chain Building",
            address="Test Address",
            financial_system_start_date=date(2025, 1, 1),
        )
        self.apartment = Apartment.objects.create(
            building=self.building,
            number="A1",
            floor=1,
            participation_mills=100,
        )

    def test_dashboard_summary_backfills_previous_month_and_carryover(self):
        # Create an expense in January
        Expense.objects.create(
            building=self.building,
            title="January Expense",
            amount=Decimal("100.00"),
            date=date(2025, 1, 15),
            category="electricity",
        )

        # Simulate gaps: remove all MonthlyBalance records (if any were created by signals)
        MonthlyBalance.objects.filter(building=self.building).delete()

        # Request February snapshot
        service = FinancialDashboardService(self.building.id)
        summary_feb = service.get_summary(month="2025-02")

        mb_jan = MonthlyBalance.objects.get(building=self.building, year=2025, month=1)
        mb_feb = MonthlyBalance.objects.get(building=self.building, year=2025, month=2)

        # February previous obligations must equal January carry forward
        assert mb_feb.previous_obligations == mb_jan.carry_forward
        assert Decimal(str(summary_feb["previous_obligations"])) == mb_feb.previous_obligations


