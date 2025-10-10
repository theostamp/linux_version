"""
Unit tests for BalanceCalculationService

Tests the centralized balance calculation logic to ensure:
1. Historical balance calculations are correct
2. Current balance calculations are correct
3. Balance updates work properly
4. Edge cases are handled (timezones, dates, etc.)
"""

from decimal import Decimal
from datetime import date, datetime
from django.test import TestCase
from django.utils import timezone
from django_tenants.utils import schema_context

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Expense, Transaction, Payment
from financial.balance_service import BalanceCalculationService
from users.models import CustomUser


class TestBalanceCalculationService(TestCase):
    """Test suite for BalanceCalculationService"""

    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            # Create test user
            self.user = CustomUser.objects.create_user(
                email='test@example.com',
                password='testpass123'
            )

            # Get the demo building (should exist from fixtures)
            self.building = Building.objects.filter(id=1).first()
            if not self.building:
                # Create if doesn't exist
                self.building = Building.objects.create(
                    id=1,
                    name='Test Building',
                    address='Test Address 1',
                    city='Athens',
                    postal_code='11111',
                    financial_system_start_date=date(2025, 6, 1)
                )

            # Get test apartment or create one
            self.apartment = Apartment.objects.filter(
                building=self.building,
                number='Α1'
            ).first()

            if not self.apartment:
                self.apartment = Apartment.objects.create(
                    building=self.building,
                    number='Α1',
                    floor=1,
                    square_meters=80,
                    participation_mills=100,
                    current_balance=Decimal('0.00')
                )

    def test_calculate_historical_balance_no_transactions(self):
        """Test historical balance with no transactions"""
        with schema_context('demo'):
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1)
            )

            self.assertEqual(balance, Decimal('0.00'))

    def test_calculate_historical_balance_with_expense(self):
        """Test historical balance with one expense"""
        with schema_context('demo'):
            # Create expense in October
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense October',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )

            # Create transaction for the expense
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense October'
            )

            # Calculate balance for November (should include October expense)
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1)
            )

            # Balance should be 100€ (debt)
            self.assertEqual(balance, Decimal('100.00'))

    def test_calculate_historical_balance_with_payment(self):
        """Test historical balance with expense and payment"""
        with schema_context('demo'):
            # Create expense
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense'
            )

            # Create payment
            payment = Payment.objects.create(
                apartment=self.apartment,
                amount=Decimal('50.00'),
                date=date(2025, 10, 20),
                payment_method='cash',
                description='Partial payment'
            )

            # Calculate balance for November
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1)
            )

            # Balance should be 50€ (100€ charge - 50€ payment)
            self.assertEqual(balance, Decimal('50.00'))

    def test_calculate_historical_balance_excludes_future_expenses(self):
        """Test that future expenses are excluded from historical balance"""
        with schema_context('demo'):
            # Create expense in October
            expense_oct = Expense.objects.create(
                building=self.building,
                title='October Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense_oct.id),
                description='October Expense'
            )

            # Create expense in November (should be excluded)
            expense_nov = Expense.objects.create(
                building=self.building,
                title='November Expense',
                amount=Decimal('200.00'),
                date=date(2025, 11, 15),
                category='utilities',
                distribution_method='equal_share'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('200.00'),
                date=timezone.make_aware(datetime(2025, 11, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense_nov.id),
                description='November Expense'
            )

            # Calculate balance for November (should only include October)
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1)
            )

            # Balance should be 100€ (only October expense)
            self.assertEqual(balance, Decimal('100.00'))

    def test_calculate_current_balance(self):
        """Test current balance calculation"""
        with schema_context('demo'):
            # Create multiple transactions
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                description='Expense 1'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('50.00'),
                date=timezone.make_aware(datetime(2025, 10, 20, 12, 0)),
                description='Expense 2'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='common_expense_payment',
                amount=Decimal('80.00'),
                date=timezone.make_aware(datetime(2025, 10, 25, 12, 0)),
                description='Payment 1'
            )

            # Calculate current balance
            balance = BalanceCalculationService.calculate_current_balance(
                self.apartment
            )

            # Balance = 100 + 50 - 80 = 70€
            self.assertEqual(balance, Decimal('70.00'))

    def test_update_apartment_balance(self):
        """Test apartment balance update"""
        with schema_context('demo'):
            # Create transaction
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                description='Test Expense'
            )

            # Update balance
            new_balance = BalanceCalculationService.update_apartment_balance(
                self.apartment
            )

            # Verify
            self.assertEqual(new_balance, Decimal('100.00'))

            # Refresh apartment from DB
            self.apartment.refresh_from_db()
            self.assertEqual(self.apartment.current_balance, Decimal('100.00'))

    def test_verify_balance_consistency_consistent(self):
        """Test balance consistency verification when consistent"""
        with schema_context('demo'):
            # Set apartment balance
            self.apartment.current_balance = Decimal('100.00')
            self.apartment.save()

            # Create matching transaction
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                description='Test'
            )

            # Verify consistency
            result = BalanceCalculationService.verify_balance_consistency(
                self.apartment
            )

            self.assertTrue(result['is_consistent'])
            self.assertEqual(result['stored_balance'], Decimal('100.00'))
            self.assertEqual(result['calculated_balance'], Decimal('100.00'))
            self.assertEqual(result['difference'], Decimal('0.00'))

    def test_verify_balance_consistency_inconsistent(self):
        """Test balance consistency verification when inconsistent"""
        with schema_context('demo'):
            # Set incorrect apartment balance
            self.apartment.current_balance = Decimal('50.00')
            self.apartment.save()

            # Create transaction with different amount
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                description='Test'
            )

            # Verify consistency
            result = BalanceCalculationService.verify_balance_consistency(
                self.apartment
            )

            self.assertFalse(result['is_consistent'])
            self.assertEqual(result['stored_balance'], Decimal('50.00'))
            self.assertEqual(result['calculated_balance'], Decimal('100.00'))
            self.assertEqual(result['difference'], Decimal('50.00'))

    def test_datetime_to_date_conversion(self):
        """Test that datetime is properly converted to date"""
        with schema_context('demo'):
            # Create expense
            expense = Expense.objects.create(
                building=self.building,
                title='Test',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )

            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test'
            )

            # Test with datetime instead of date
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=datetime(2025, 11, 1, 12, 0, 0)  # datetime, not date
            )

            self.assertEqual(balance, Decimal('100.00'))

    def test_no_financial_system_start_date(self):
        """Test when building has no financial_system_start_date"""
        with schema_context('demo'):
            # Set financial_system_start_date to None
            self.building.financial_system_start_date = None
            self.building.save()

            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1)
            )

            # Should return 0.00 when no system start date
            self.assertEqual(balance, Decimal('0.00'))

    def test_balance_adjustment_transaction(self):
        """Test balance adjustment transaction type"""
        with schema_context('demo'):
            # Create initial transactions
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                description='Expense'
            )

            # Create balance adjustment
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='balance_adjustment',
                amount=Decimal('0.00'),
                balance_after=Decimal('50.00'),
                date=timezone.make_aware(datetime(2025, 10, 20, 12, 0)),
                description='Manual adjustment'
            )

            # Current balance should be 50€ (set by adjustment)
            balance = BalanceCalculationService.calculate_current_balance(
                self.apartment
            )

            self.assertEqual(balance, Decimal('50.00'))

    def test_calculate_historical_balance_with_reserve_fund(self):
        """Test historical balance with reserve fund included"""
        with schema_context('demo'):
            # Set up reserve fund for building
            self.building.reserve_fund_goal = Decimal('1200.00')
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.save()
            
            # Create expense in October
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )
            
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense'
            )
            
            # Calculate balance for November with reserve fund
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1),
                include_reserve_fund=True
            )
            
            # Balance should be 100€ (expense) + reserve fund share
            # With 1 apartment and 100 participation mills, it should get 100€ monthly reserve
            self.assertGreater(balance, Decimal('100.00'))
            
    def test_calculate_historical_balance_outside_reserve_fund_period(self):
        """Test that reserve fund is not charged outside its period"""
        with schema_context('demo'):
            # Set up reserve fund starting in November
            self.building.reserve_fund_goal = Decimal('1200.00')
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_start_date = date(2025, 11, 1)
            self.building.save()
            
            # Create expense in October
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )
            
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense'
            )
            
            # Calculate balance for November (before reserve fund starts)
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1),
                include_reserve_fund=True
            )
            
            # Balance should be exactly 100€ (no reserve fund yet)
            self.assertEqual(balance, Decimal('100.00'))
            
    def test_calculate_historical_balance_with_management_and_reserve(self):
        """Test historical balance with both management fees and reserve fund"""
        with schema_context('demo'):
            # Set up management fees
            self.building.management_fee_per_apartment = Decimal('20.00')
            # Set up reserve fund
            self.building.reserve_fund_goal = Decimal('1200.00')
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.save()
            
            # Create expense in October
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )
            
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense'
            )
            
            # Calculate balance for November
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1),
                include_management_fees=True,
                include_reserve_fund=True
            )
            
            # Balance should be 100€ (expense) + 20€ (management) + reserve fund share
            self.assertGreater(balance, Decimal('120.00'))
            
    def test_calculate_historical_balance_no_reserve_fund_config(self):
        """Test graceful handling when reserve fund is not configured"""
        with schema_context('demo'):
            # No reserve fund configuration
            self.building.reserve_fund_goal = None
            self.building.reserve_fund_duration_months = None
            self.building.reserve_fund_start_date = None
            self.building.save()
            
            # Create expense
            expense = Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('100.00'),
                date=date(2025, 10, 15),
                category='utilities',
                distribution_method='equal_share'
            )
            
            Transaction.objects.create(
                apartment=self.apartment,
                building=self.building,
                type='expense_created',
                amount=Decimal('100.00'),
                date=timezone.make_aware(datetime(2025, 10, 15, 12, 0)),
                reference_type='expense',
                reference_id=str(expense.id),
                description='Test Expense'
            )
            
            # Calculate balance with reserve fund flag (should handle gracefully)
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=self.apartment,
                end_date=date(2025, 11, 1),
                include_reserve_fund=True
            )
            
            # Balance should be exactly 100€ (no reserve fund)
            self.assertEqual(balance, Decimal('100.00'))

    def tearDown(self):
        """Clean up test data"""
        with schema_context('demo'):
            # Clean up is automatic with TestCase
            pass
