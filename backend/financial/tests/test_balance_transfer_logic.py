"""
Unit tests για Balance Transfer Logic

⚠️ ΚΡΙΣΙΜΟ: Αυτά τα tests θωρακίζουν τη λογική μεταφοράς υπολοίπων
ΑΝ ΑΠΟΤΥΧΟΥΝ, ΜΗΝ ΠΡΟΧΩΡΗΣΕΤΕ ΜΕ ΑΛΛΑΓΕΣ!

Βλέπε: BALANCE_TRANSFER_ARCHITECTURE.md
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date
from decimal import Decimal
import calendar

from financial.validators import (
    ExpenseDateValidator,
    BuildingFinancialValidator,
    BalanceTransferValidator
)
from financial.models import Expense
from buildings.models import Building
from apartments.models import Apartment


class ExpenseDateValidatorTest(TestCase):
    """Tests για ExpenseDateValidator"""

    def test_installment_date_must_be_last_day_of_month(self):
        """⚠️ ΚΡΙΣΙΜΟ: Δόση πρέπει να έχει date = τελευταία μήνα"""

        # Valid: Τελευταία Οκτωβρίου
        valid_date = date(2025, 10, 31)
        ExpenseDateValidator.validate_installment_date(
            valid_date, valid_date, "Έργο - Δόση 1/4"
        )  # Should not raise

        # Invalid: Πρώτη Οκτωβρίου
        invalid_date = date(2025, 10, 1)
        with self.assertRaises(ValidationError) as cm:
            ExpenseDateValidator.validate_installment_date(
                invalid_date, invalid_date, "Έργο - Δόση 1/4"
            )
        self.assertIn("τελευταία του μήνα", str(cm.exception))

    def test_installment_date_must_equal_due_date(self):
        """⚠️ ΚΡΙΣΙΜΟ: Για δόση, date πρέπει να είναι ίσο με due_date"""

        valid_date = date(2025, 10, 31)
        different_due = date(2025, 10, 15)

        with self.assertRaises(ValidationError) as cm:
            ExpenseDateValidator.validate_installment_date(
                valid_date, different_due, "Έργο - Δόση 1/4"
            )
        self.assertIn("date == due_date", str(cm.exception))

    def test_management_fee_date_must_be_last_day(self):
        """⚠️ ΚΡΙΣΙΜΟ: Management fee πρέπει να έχει date = τελευταία μήνα"""

        # Valid
        valid_date = date(2025, 10, 31)
        ExpenseDateValidator.validate_management_fee_date(
            valid_date, 'management_fees', 'equal_share'
        )  # Should not raise

        # Invalid: Πρώτη του μήνα
        invalid_date = date(2025, 10, 1)
        with self.assertRaises(ValidationError) as cm:
            ExpenseDateValidator.validate_management_fee_date(
                invalid_date, 'management_fees', 'equal_share'
            )
        self.assertIn("τελευταία του μήνα", str(cm.exception))

    def test_management_fee_must_be_equal_share(self):
        """⚠️ ΚΡΙΣΙΜΟ: Management fee πρέπει να έχει distribution_type='equal_share'"""

        valid_date = date(2025, 10, 31)

        # Valid
        ExpenseDateValidator.validate_management_fee_date(
            valid_date, 'management_fees', 'equal_share'
        )  # Should not raise

        # Invalid: by_participation_mills
        with self.assertRaises(ValidationError) as cm:
            ExpenseDateValidator.validate_management_fee_date(
                valid_date, 'management_fees', 'by_participation_mills'
            )
        self.assertIn("equal_share", str(cm.exception))

    def test_advance_payment_and_first_installment_different_months(self):
        """⚠️ ΚΡΙΣΙΜΟ: Προκαταβολή και Δόση 1 πρέπει να είναι σε διαφορετικούς μήνες"""

        # Valid: Διαφορετικοί μήνες
        advance_date = date(2025, 10, 3)
        first_installment = date(2025, 11, 30)
        ExpenseDateValidator.validate_advance_payment_not_overlapping(
            advance_date, first_installment
        )  # Should not raise

        # Invalid: Ίδιος μήνας
        same_month_installment = date(2025, 10, 31)
        with self.assertRaises(ValidationError) as cm:
            ExpenseDateValidator.validate_advance_payment_not_overlapping(
                advance_date, same_month_installment
            )
        self.assertIn("διαφορετικό μήνα", str(cm.exception))


class BalanceTransferIntegrationTest(TestCase):
    """Integration tests για balance transfer logic"""

    def setUp(self):
        """Set up test data"""
        self.building = Building.objects.create(
            name="Test Building",
            address="Test Address",
            financial_system_start_date=date(2025, 10, 1),
            management_fee_per_apartment=Decimal('1.00')
        )

        self.apartment = Apartment.objects.create(
            building=self.building,
            number="1",
            participation_mills=100
        )

    def test_project_installments_scenario(self):
        """
        Test: Σενάριο δόσεων έργου
        - Προκαταβολή: 03/10/2025
        - Δόση 1: 30/11/2025 (όχι 31/10!)
        - Δόση 2: 31/12/2025
        """

        # Προκαταβολή
        advance = Expense.objects.create(
            building=self.building,
            title="Έργο - Προκαταβολή (20%)",
            amount=Decimal('1000.00'),
            date=date(2025, 10, 3),
            due_date=date(2025, 10, 18),
            category='project',
            distribution_type='by_participation_mills'
        )

        # Δόσεις
        installment1 = Expense.objects.create(
            building=self.building,
            title="Έργο - Δόση 1/4",
            amount=Decimal('1000.00'),
            date=date(2025, 11, 30),  # ⚠️ ΚΡΙΣΙΜΟ: Τελευταία Νοεμβρίου
            due_date=date(2025, 11, 30),
            category='project',
            distribution_type='by_participation_mills'
        )

        installment2 = Expense.objects.create(
            building=self.building,
            title="Έργο - Δόση 2/4",
            amount=Decimal('1000.00'),
            date=date(2025, 12, 31),  # ⚠️ ΚΡΙΣΙΜΟ: Τελευταία Δεκεμβρίου
            due_date=date(2025, 12, 31),
            category='project',
            distribution_type='by_participation_mills'
        )

        # Validation
        validator = BalanceTransferValidator()
        warnings = validator.validate_project_installments(
            None, advance.date, [installment1, installment2]
        )

        self.assertEqual(len(warnings), 0, f"Warnings: {warnings}")

        # ✅ Ελέγχουμε ότι advance και installment1 είναι σε διαφορετικούς μήνες
        self.assertNotEqual(advance.date.month, installment1.date.month)

    def test_management_fees_scenario(self):
        """
        Test: Σενάριο management fees
        - Οκτ: 31/10/2025
        - Νοε: 30/11/2025
        - Δεκ: 31/12/2025
        """

        mgmt_oct = Expense.objects.create(
            building=self.building,
            title="Διαχειριστικά Έξοδα Οκτώβριος 2025",
            amount=Decimal('10.00'),
            date=date(2025, 10, 31),  # ⚠️ ΚΡΙΣΙΜΟ: Τελευταία Οκτωβρίου
            due_date=date(2025, 10, 31),
            category='management_fees',
            distribution_type='equal_share'  # ⚠️ ΚΡΙΣΙΜΟ: equal_share
        )

        # Validation
        result = check_expense_balance_transfer_compliance(mgmt_oct)
        self.assertTrue(result['compliant'], f"Warnings: {result['warnings']}")

        # ✅ Ελέγχουμε ότι είναι τελευταία του μήνα
        last_day = calendar.monthrange(2025, 10)[1]
        self.assertEqual(mgmt_oct.date.day, last_day)


class BuildingFinancialValidatorTest(TestCase):
    """Tests για BuildingFinancialValidator"""

    def test_building_must_have_financial_start_date(self):
        """⚠️ ΚΡΙΣΙΜΟ: Building πρέπει να έχει financial_system_start_date"""

        # Valid
        building_with_date = Building.objects.create(
            name="Valid Building",
            address="Test",
            financial_system_start_date=date(2025, 10, 1)
        )
        BuildingFinancialValidator.validate_financial_system_start_date(
            building_with_date
        )  # Should not raise

        # Invalid
        building_without_date = Building.objects.create(
            name="Invalid Building",
            address="Test"
        )
        with self.assertRaises(ValidationError) as cm:
            BuildingFinancialValidator.validate_financial_system_start_date(
                building_without_date
            )
        self.assertIn("financial_system_start_date", str(cm.exception))


# Import utility functions
from financial.validators import (
    check_expense_balance_transfer_compliance,
    check_building_balance_transfer_compliance
)
