"""
ΚΡΙΣΙΜΟ TEST: Μεταφορά Οφειλών (Carry Forward)

Αυτό το test διασφαλίζει ότι οι οφειλές μεταφέρονται ΣΩΣΤΑ από μήνα σε μήνα.
Αν αυτό το test fail, ΔΕΝ deploy στο production!
"""
import pytest
from decimal import Decimal
from datetime import date
from django.test import TestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, MonthlyBalance
from users.models import CustomUser as User


class MonthlyBalanceCarryForwardTest(TenantTestCase):
    """
    ✅ CRITICAL: Test αθροιστικής μεταφοράς οφειλών
    
    Scenario:
    - Μήνας 1: Δαπάνες €100, Πληρωμές €0 → Carry: €100
    - Μήνας 2: Δαπάνες €100, Πληρωμές €0 → Carry: €200 (100+100)
    - Μήνας 3: Δαπάνες €100, Πληρωμές €50 → Carry: €250 (200+100-50)
    """
    
    def setUp(self):
        """Setup test building & apartment"""
        self.building = Building.objects.create(
            name="Test Building",
            address="Test Address",
            financial_system_start_date=date(2025, 1, 1)
        )
        
        self.apartment = Apartment.objects.create(
            building=self.building,
            number="101",
            floor=1,
            owner_name="Test Owner",
            participation_mills=100
        )
    
    def test_cumulative_carry_forward_with_expenses_only(self):
        """
        Test 1: Μόνο δαπάνες (χωρίς πληρωμές)
        Expected: Carry forward αυξάνεται αθροιστικά
        """
        # Month 1: €100 expenses
        Expense.objects.create(
            building=self.building,
            title="Month 1 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 1, 15),
            category='electricity'
        )
        
        # Month 2: €100 expenses
        Expense.objects.create(
            building=self.building,
            title="Month 2 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 2, 15),
            category='electricity'
        )
        
        # Month 3: €100 expenses
        Expense.objects.create(
            building=self.building,
            title="Month 3 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 3, 15),
            category='electricity'
        )
        
        # Verify MonthlyBalance carry_forward
        mb_jan = MonthlyBalance.objects.get(building=self.building, year=2025, month=1)
        mb_feb = MonthlyBalance.objects.get(building=self.building, year=2025, month=2)
        mb_mar = MonthlyBalance.objects.get(building=self.building, year=2025, month=3)
        
        # ✅ CRITICAL ASSERTIONS
        self.assertEqual(mb_jan.carry_forward, Decimal('100.00'), 
                        "❌ FAIL: Month 1 carry_forward should be €100")
        
        self.assertEqual(mb_feb.carry_forward, Decimal('200.00'), 
                        "❌ FAIL: Month 2 carry_forward should be €200 (cumulative)")
        
        self.assertEqual(mb_mar.carry_forward, Decimal('300.00'), 
                        "❌ FAIL: Month 3 carry_forward should be €300 (cumulative)")
    
    def test_carry_forward_with_partial_payment(self):
        """
        Test 2: Δαπάνες + μερική πληρωμή
        Expected: Carry forward μειώνεται με πληρωμές
        """
        # Month 1: €100 expenses, €0 payments
        Expense.objects.create(
            building=self.building,
            title="Month 1 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 1, 15),
            category='electricity'
        )
        
        # Month 2: €100 expenses, €50 payment
        Expense.objects.create(
            building=self.building,
            title="Month 2 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 2, 15),
            category='electricity'
        )
        
        Payment.objects.create(
            apartment=self.apartment,
            amount=Decimal('50.00'),
            date=date(2025, 2, 20),
            payment_method='cash'
        )
        
        # Verify
        mb_jan = MonthlyBalance.objects.get(building=self.building, year=2025, month=1)
        mb_feb = MonthlyBalance.objects.get(building=self.building, year=2025, month=2)
        
        self.assertEqual(mb_jan.carry_forward, Decimal('100.00'))
        self.assertEqual(mb_feb.carry_forward, Decimal('150.00'), 
                        "❌ FAIL: Month 2 should be €150 (100 + 100 - 50)")
    
    def test_carry_forward_with_full_payment(self):
        """
        Test 3: Πλήρης εξόφληση
        Expected: Carry forward = 0
        """
        # Month 1: €100 expenses, €100 payment
        Expense.objects.create(
            building=self.building,
            title="Month 1 Expense",
            amount=Decimal('100.00'),
            date=date(2025, 1, 15),
            category='electricity'
        )
        
        Payment.objects.create(
            apartment=self.apartment,
            amount=Decimal('100.00'),
            date=date(2025, 1, 20),
            payment_method='cash'
        )
        
        # Verify
        mb_jan = MonthlyBalance.objects.get(building=self.building, year=2025, month=1)
        
        self.assertEqual(mb_jan.carry_forward, Decimal('0.00'), 
                        "❌ FAIL: Full payment should result in €0 carry_forward")
    
    def test_carry_forward_persists_across_months(self):
        """
        Test 4: Carry forward διατηρείται σωστά σε 6μηνη περίοδο
        """
        cumulative = Decimal('0.00')
        
        for month in range(1, 7):
            # €100 expense per month
            Expense.objects.create(
                building=self.building,
                title=f"Month {month} Expense",
                amount=Decimal('100.00'),
                date=date(2025, month, 15),
                category='electricity'
            )
            
            cumulative += Decimal('100.00')
            
            # Verify
            mb = MonthlyBalance.objects.get(
                building=self.building, 
                year=2025, 
                month=month
            )
            
            self.assertEqual(
                mb.carry_forward, 
                cumulative,
                f"❌ FAIL: Month {month} carry_forward should be €{cumulative}"
            )


# ✅ Πώς να τρέξεις το test:
# cd /app && python manage.py test financial.tests.test_monthly_balance_carry_forward --keepdb

