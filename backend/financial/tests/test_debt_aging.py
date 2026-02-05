from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django_tenants.test.cases import TenantTestCase

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Expense, Payment
from financial.services import FinancialDashboardService


class DebtAgingBucketsTest(TenantTestCase):
    def setUp(self):
        self.today = timezone.now().date()
        self.building = Building.objects.create(
            name="Aging Test Building",
            address="Test Address",
            financial_system_start_date=self.today - timedelta(days=200),
        )

        self.apartments = [
            Apartment.objects.create(
                building=self.building,
                number=f"A{i}",
                floor=1,
                owner_name=f"Owner {i}",
                participation_mills=100,
            )
            for i in range(1, 5)
        ]

        Expense.objects.create(
            building=self.building,
            title="Shared Expense",
            amount=Decimal("400.00"),
            date=self.today - timedelta(days=120),
            category="cleaning",
            distribution_type="equal_share",
        )

        payment_dates = [
            self.today - timedelta(days=10),   # 0-30
            self.today - timedelta(days=40),   # 31-60
            self.today - timedelta(days=70),   # 61-90
            self.today - timedelta(days=120),  # 90+
        ]

        for apartment, payment_date in zip(self.apartments, payment_dates):
            Payment.objects.create(
                apartment=apartment,
                amount=Decimal("1.00"),
                date=payment_date,
                method="cash",
                payment_type="common_expense",
                payer_type="owner",
                payer_name=apartment.owner_name,
            )

    def test_debt_report_buckets(self):
        service = FinancialDashboardService(self.building.id)
        report = service.get_debt_report()
        buckets = report["summary"]["buckets"]

        self.assertEqual(buckets["0-30"]["count"], 1)
        self.assertEqual(buckets["31-60"]["count"], 1)
        self.assertEqual(buckets["61-90"]["count"], 1)
        self.assertEqual(buckets["90+"]["count"], 1)

        # All buckets should have positive amounts
        for bucket in buckets.values():
            self.assertGreater(bucket["amount"], 0)
