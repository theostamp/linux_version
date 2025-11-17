"""
Tests for payer_responsibility functionality in Expense Allocation Plan

Tests cover:
- Default payer classification by category
- Expense allocation with owner vs resident expenses
- FinancialDashboardService payer separation
- AdvancedCommonExpenseCalculator payer separation
- Split ratio for shared expenses
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime
from unittest.mock import patch, MagicMock

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

import pytest
from django_tenants.utils import schema_context
from django.test import TestCase
from django.utils import timezone

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from financial.services import FinancialDashboardService, AdvancedCommonExpenseCalculator
from users.models import CustomUser


class TestPayerResponsibilityDefaults(TestCase):
    """Tests for default payer classification by category"""
    
    def test_resident_category_defaults(self):
        """Test that resident categories default to 'resident'"""
        with schema_context('demo'):
            resident_categories = [
                'cleaning', 'electricity_common', 'water_common',
                'garbage_collection', 'management_fees', 'heating_fuel'
            ]
            
            for category in resident_categories:
                default = Expense.get_default_payer_for_category(category)
                self.assertEqual(default, 'resident', 
                    f"Category {category} should default to 'resident', got '{default}'")
    
    def test_owner_category_defaults(self):
        """Test that owner categories default to 'owner'"""
        with schema_context('demo'):
            owner_categories = [
                'reserve_fund', 'project', 'building_insurance',
                'building_maintenance', 'roof_repair', 'emergency_repair'
            ]
            
            for category in owner_categories:
                default = Expense.get_default_payer_for_category(category)
                self.assertEqual(default, 'owner',
                    f"Category {category} should default to 'owner', got '{default}'")
    
    def test_shared_category_defaults(self):
        """Test that shared categories default to 'shared'"""
        with schema_context('demo'):
            shared_categories = [
                'elevator_repair', 'heating_repair', 'locksmith',
                'miscellaneous', 'other'
            ]
            
            for category in shared_categories:
                default = Expense.get_default_payer_for_category(category)
                self.assertEqual(default, 'shared',
                    f"Category {category} should default to 'shared', got '{default}'")
    
    def test_all_categories_have_defaults(self):
        """Test that all expense categories have a default payer"""
        with schema_context('demo'):
            categories = [cat[0] for cat in Expense.EXPENSE_CATEGORIES]
            
            for category in categories:
                default = Expense.get_default_payer_for_category(category)
                self.assertIn(default, ['owner', 'resident', 'shared'],
                    f"Category {category} has invalid default: {default}")


class TestExpensePayerResponsibility(TestCase):
    """Tests for expense creation with payer_responsibility"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='payer@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Payer Test Building',
                address='Test Address',
                management_fee_per_apartment=Decimal('50.00')
            )
            
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=100,
                heating_mills=90,
                square_meters=75,
                current_balance=Decimal('0.00')
            )
    
    def test_expense_auto_sets_payer_from_category(self):
        """Test that expense auto-sets payer_responsibility from category"""
        with schema_context('demo'):
            # Resident expense
            expense_resident = Expense.objects.create(
                building=self.building,
                title='Cleaning',
                amount=Decimal('100.00'),
                date=date.today(),
                category='cleaning',
                distribution_type='by_participation_mills'
            )
            self.assertEqual(expense_resident.payer_responsibility, 'resident')
            
            # Owner expense
            expense_owner = Expense.objects.create(
                building=self.building,
                title='Reserve Fund',
                amount=Decimal('500.00'),
                date=date.today(),
                category='reserve_fund',
                distribution_type='equal_share'
            )
            self.assertEqual(expense_owner.payer_responsibility, 'owner')
    
    def test_expense_with_shared_payer_and_split_ratio(self):
        """Test expense with shared payer and split_ratio"""
        with schema_context('demo'):
            expense = Expense.objects.create(
                building=self.building,
                title='Elevator Repair',
                amount=Decimal('1000.00'),
                date=date.today(),
                category='elevator_repair',
                distribution_type='by_participation_mills',
                payer_responsibility='shared',
                split_ratio=Decimal('0.6')  # 60% owner, 40% resident
            )
            
            self.assertEqual(expense.payer_responsibility, 'shared')
            self.assertEqual(expense.split_ratio, Decimal('0.6'))
    
    def test_expense_manual_override_payer(self):
        """Test that payer_responsibility can be manually overridden"""
        with schema_context('demo'):
            # Even though cleaning defaults to resident, we can set it to owner
            expense = Expense.objects.create(
                building=self.building,
                title='Special Cleaning',
                amount=Decimal('200.00'),
                date=date.today(),
                category='cleaning',
                distribution_type='by_participation_mills',
                payer_responsibility='owner'  # Manual override
            )
            
            self.assertEqual(expense.payer_responsibility, 'owner')

    def test_expense_save_without_manager_sets_default_payer(self):
        """Even manual Expense.save() should apply category defaults"""
        with schema_context('demo'):
            expense = Expense(
                building=self.building,
                title='Project Manual Save',
                amount=Decimal('750.00'),
                date=date.today(),
                category='project',
                distribution_type='by_participation_mills'
            )
            # Σκόπιμα δεν ορίζουμε payer_responsibility πριν το save
            expense.save()
            self.assertEqual(expense.payer_responsibility, 'owner')


class TestFinancialDashboardPayerSeparation(TestCase):
    """Tests for FinancialDashboardService payer separation"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='dashboard@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Dashboard Test Building',
                address='Test Address',
                management_fee_per_apartment=Decimal('50.00'),
                financial_system_start_date=date(2025, 1, 1)
            )
            
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=100,
                heating_mills=90,
                square_meters=75,
                current_balance=Decimal('0.00')
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2',
                building=self.building,
                participation_mills=150,
                heating_mills=130,
                square_meters=85,
                current_balance=Decimal('0.00')
            )
    
    def test_apartment_balances_separate_owner_resident(self):
        """Test that apartment balances separate owner vs resident expenses"""
        with schema_context('demo'):
            # Create resident expense
            Expense.objects.create(
                building=self.building,
                title='Cleaning',
                amount=Decimal('200.00'),
                date=date(2025, 8, 15),
                category='cleaning',
                distribution_type='by_participation_mills',
                payer_responsibility='resident'
            )
            
            # Create owner expense
            Expense.objects.create(
                building=self.building,
                title='Reserve Fund',
                amount=Decimal('500.00'),
                date=date(2025, 8, 15),
                category='reserve_fund',
                distribution_type='equal_share',
                payer_responsibility='owner'
            )
            
            service = FinancialDashboardService(self.building.id)
            balances = service.get_apartment_balances('2025-08')
            
            # Check that balances include owner_expenses and resident_expenses
            for balance in balances:
                self.assertIn('owner_expenses', balance)
                self.assertIn('resident_expenses', balance)
                
                # Verify that owner expenses are separate from resident expenses
                self.assertGreaterEqual(balance['owner_expenses'], 0)
                self.assertGreaterEqual(balance['resident_expenses'], 0)
    
    def test_shared_expense_with_split_ratio(self):
        """Test shared expense allocation with split_ratio"""
        with schema_context('demo'):
            # Create shared expense with 60% owner, 40% resident
            Expense.objects.create(
                building=self.building,
                title='Elevator Repair',
                amount=Decimal('1000.00'),
                date=date(2025, 8, 15),
                category='elevator_repair',
                distribution_type='by_participation_mills',
                payer_responsibility='shared',
                split_ratio=Decimal('0.6')
            )
            
            service = FinancialDashboardService(self.building.id)
            balances = service.get_apartment_balances('2025-08')
            
            # Verify that shared expense is split correctly
            total_owner = sum(b['owner_expenses'] for b in balances)
            total_resident = sum(b['resident_expenses'] for b in balances)
            
            # With 60% split, owner should get ~60% of 1000 = 600, resident ~40% = 400
            # Allow for rounding differences
            self.assertAlmostEqual(float(total_owner), 600.0, delta=10.0)
            self.assertAlmostEqual(float(total_resident), 400.0, delta=10.0)
    
    def test_expense_breakdown_includes_payer_responsibility(self):
        """Test that expense breakdown includes payer_responsibility"""
        with schema_context('demo'):
            Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('300.00'),
                date=date(2025, 8, 15),
                category='building_maintenance',
                distribution_type='by_participation_mills',
                payer_responsibility='owner'
            )
            
            service = FinancialDashboardService(self.building.id)
            breakdown = service.get_expense_breakdown('2025-08')
            
            # Verify breakdown includes payer_responsibility
            self.assertGreater(len(breakdown), 0)
            for item in breakdown:
                self.assertIn('payer_responsibility', item)
                self.assertIn(item['payer_responsibility'], ['owner', 'resident', 'shared'])


class TestAdvancedCalculatorPayerSeparation(TestCase):
    """Tests for AdvancedCommonExpenseCalculator payer separation"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='calculator@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Calculator Test Building',
                address='Test Address',
                management_fee_per_apartment=Decimal('50.00'),
                reserve_fund_goal=Decimal('10000.00'),
                reserve_fund_duration_months=20
            )
            
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=100,
                heating_mills=90,
                elevator_mills=100,
                square_meters=75,
                current_balance=Decimal('0.00')
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2',
                building=self.building,
                participation_mills=150,
                heating_mills=130,
                elevator_mills=150,
                square_meters=85,
                current_balance=Decimal('0.00')
            )
    
    def test_calculator_separates_owner_resident_expenses(self):
        """Test that calculator separates owner vs resident expenses"""
        with schema_context('demo'):
            # Create resident expense
            Expense.objects.create(
                building=self.building,
                title='Cleaning',
                amount=Decimal('200.00'),
                date=date(2025, 8, 15),
                category='cleaning',
                distribution_type='by_participation_mills',
                payer_responsibility='resident'
            )
            
            # Create owner expense
            Expense.objects.create(
                building=self.building,
                title='Building Repair',
                amount=Decimal('500.00'),
                date=date(2025, 8, 15),
                category='building_maintenance',
                distribution_type='by_participation_mills',
                payer_responsibility='owner'
            )
            
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Verify shares include owner_expenses and resident_expenses
            for apartment_id, share in result['shares'].items():
                breakdown = share.get('breakdown', {})
                self.assertIn('owner_expenses', breakdown)
                self.assertIn('resident_expenses', breakdown)
                
                # Verify separation
                self.assertGreaterEqual(breakdown['owner_expenses'], 0)
                self.assertGreaterEqual(breakdown['resident_expenses'], 0)
    
    def test_expense_totals_separate_owner_resident(self):
        """Test that expense totals separate owner vs resident"""
        with schema_context('demo'):
            # Create expenses with different payer responsibilities
            Expense.objects.create(
                building=self.building,
                title='Resident Expense',
                amount=Decimal('300.00'),
                date=date(2025, 8, 15),
                category='cleaning',
                distribution_type='by_participation_mills',
                payer_responsibility='resident'
            )
            
            Expense.objects.create(
                building=self.building,
                title='Owner Expense',
                amount=Decimal('700.00'),
                date=date(2025, 8, 15),
                category='building_maintenance',
                distribution_type='by_participation_mills',
                payer_responsibility='owner'
            )
            
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            expense_totals = calculator._calculate_expense_totals()
            
            # Verify totals include owner and resident breakdowns
            self.assertIn('owner_general', expense_totals)
            self.assertIn('resident_general', expense_totals)
            
            # Verify totals match expected values
            self.assertGreater(expense_totals['owner_general'], 0)
            self.assertGreater(expense_totals['resident_general'], 0)
    
    def test_expense_details_include_payer_responsibility(self):
        """Test that expense details include payer_responsibility"""
        with schema_context('demo'):
            Expense.objects.create(
                building=self.building,
                title='Test Expense',
                amount=Decimal('400.00'),
                date=date(2025, 8, 15),
                category='elevator_maintenance',
                distribution_type='by_participation_mills',
                payer_responsibility='resident'
            )
            
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            expense_details = calculator._get_expense_details()
            
            # Verify expense details include payer_responsibility
            for category, expenses in expense_details.items():
                for expense in expenses:
                    self.assertIn('payer_responsibility', expense)
                    self.assertIn(expense['payer_responsibility'], ['owner', 'resident', 'shared'])


class TestSplitRatioValidation(TestCase):
    """Tests for split_ratio validation"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='split@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Split Test Building',
                address='Test Address',
                management_fee_per_apartment=Decimal('50.00')
            )
    
    def test_split_ratio_only_with_shared(self):
        """Test that split_ratio can only be used with shared payer_responsibility"""
        with schema_context('demo'):
            from rest_framework.exceptions import ValidationError
            from financial.serializers import ExpenseSerializer
            
            # This should work: shared with split_ratio
            data = {
                'building': self.building.id,
                'title': 'Shared Expense',
                'amount': '1000.00',
                'date': '2025-08-15',
                'category': 'elevator_repair',
                'distribution_type': 'by_participation_mills',
                'payer_responsibility': 'shared',
                'split_ratio': '0.6'
            }
            
            serializer = ExpenseSerializer(data=data)
            self.assertTrue(serializer.is_valid(), serializer.errors)
            
            # This should fail: owner with split_ratio
            data_invalid = {
                'building': self.building.id,
                'title': 'Owner Expense',
                'amount': '500.00',
                'date': '2025-08-15',
                'category': 'building_maintenance',
                'distribution_type': 'by_participation_mills',
                'payer_responsibility': 'owner',
                'split_ratio': '0.6'
            }
            
            serializer_invalid = ExpenseSerializer(data=data_invalid)
            self.assertFalse(serializer_invalid.is_valid())
            self.assertIn('split_ratio', serializer_invalid.errors)
    
    def test_split_ratio_range_validation(self):
        """Test that split_ratio must be between 0 and 1"""
        with schema_context('demo'):
            from financial.serializers import ExpenseSerializer
            
            # Test invalid split_ratio > 1
            data_invalid = {
                'building': self.building.id,
                'title': 'Invalid Split',
                'amount': '1000.00',
                'date': '2025-08-15',
                'category': 'elevator_repair',
                'distribution_type': 'by_participation_mills',
                'payer_responsibility': 'shared',
                'split_ratio': '1.5'  # Invalid: > 1
            }
            
            serializer = ExpenseSerializer(data=data_invalid)
            self.assertFalse(serializer.is_valid())
            self.assertIn('split_ratio', serializer.errors)
            
            # Test invalid split_ratio < 0
            data_invalid2 = {
                'building': self.building.id,
                'title': 'Invalid Split',
                'amount': '1000.00',
                'date': '2025-08-15',
                'category': 'elevator_repair',
                'distribution_type': 'by_participation_mills',
                'payer_responsibility': 'shared',
                'split_ratio': '-0.1'  # Invalid: < 0
            }
            
            serializer2 = ExpenseSerializer(data=data_invalid2)
            self.assertFalse(serializer2.is_valid())
            self.assertIn('split_ratio', serializer2.errors)


