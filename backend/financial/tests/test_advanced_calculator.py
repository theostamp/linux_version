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

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, Transaction
from financial.services import AdvancedCommonExpenseCalculator
from users.models import CustomUser


class TestAdvancedCommonExpenseCalculator(TestCase):
    """
    Comprehensive tests for AdvancedCommonExpenseCalculator
    Tests cover:
    - Balance transfer scenarios  
    - Expense distribution algorithms
    - Reserve fund calculations
    - Edge cases and error handling
    """
    
    def setUp(self):
        """Set up test data with realistic financial scenarios"""
        with schema_context('demo'):
            # Create test user
            self.user = CustomUser.objects.create_user(
                email='test@example.com',
                password='testpass'
            )
            
            # Create test building
            self.building = Building.objects.create(
                name='Test Building',
                address='Test Address',
                reserve_fund_goal=Decimal('10000.00'),
                reserve_fund_duration_months=20,
                management_fee_per_apartment=Decimal('50.00')
            )
            
            # Create test apartments with realistic participation mills
            # For reserve fund test, use apartments with no obligations
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=120,  # 12% participation
                heating_mills=100,
                square_meters=80,
                current_balance=Decimal('0.00')  # No debt for reserve fund test
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2', 
                building=self.building,
                participation_mills=150,  # 15% participation
                heating_mills=130,
                square_meters=95,
                current_balance=Decimal('0.00')  # No debt for reserve fund test
            )
            
            self.apt3 = Apartment.objects.create(
                number='Γ3',  # Greek letter apartment
                building=self.building,
                participation_mills=200,  # 20% participation
                heating_mills=180,
                square_meters=120,
                current_balance=Decimal('0.00')  # Balanced
            )
            
            # Create test expenses with different distribution methods
            self.expense_by_mills = Expense.objects.create(
                building=self.building,
                title='Elevator Maintenance',
                amount=Decimal('500.00'),
                date=date(2025, 8, 15),
                distribution_type='by_participation_mills',
                category='elevator_maintenance'
            )
            
            self.expense_equal_share = Expense.objects.create(
                building=self.building,
                title='Cleaning Supplies',
                amount=Decimal('300.00'),
                date=date(2025, 8, 10),
                distribution_type='equal_share',
                category='cleaning'
            )
            
            self.expense_by_meters = Expense.objects.create(
                building=self.building,
                title='Heating Oil',
                amount=Decimal('800.00'),
                date=date(2025, 8, 5),
                distribution_type='by_meters',
                category='heating_fuel'
            )
    
    def test_calculator_initialization(self):
        """Test calculator initializes correctly with different parameters"""
        with schema_context('demo'):
            # Basic initialization
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            self.assertEqual(calculator.building_id, self.building.id)
            self.assertEqual(calculator.building, self.building)
            self.assertEqual(calculator.apartments.count(), 3)
            
            # Initialize with period dates
            calculator_period = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            self.assertEqual(calculator_period.period_end_date, date(2025, 8, 31))
            
            # Initialize with custom reserve fund amount
            calculator_reserve = AdvancedCommonExpenseCalculator(
                self.building.id,
                reserve_fund_monthly_total=Decimal('600.00')
            )
            self.assertEqual(calculator_reserve.reserve_fund_monthly_total, Decimal('600.00'))
    
    def test_get_historical_balance(self):
        """Test historical balance calculation accuracy"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            
            # Create payment history for apt1
            Payment.objects.create(
                apartment=self.apt1,
                amount=Decimal('200.00'),
                date=date(2025, 7, 15),
                method='bank_transfer'
            )
            
            # Create transaction history
            Transaction.objects.create(
                apartment_number=self.apt1.number,
                amount=Decimal('100.00'),
                type='common_expense_charge',
                date=datetime(2025, 7, 10),
                description='July Common Expenses'
            )
            
            # Test historical balance calculation
            balance = calculator._get_historical_balance(self.apt1, date(2025, 8, 1))
            expected_balance = Decimal('200.00') - Decimal('100.00')  # payment - charge
            self.assertEqual(balance, expected_balance)
    
    def test_expense_distribution_by_participation_mills(self):
        """Test expense distribution based on participation mills"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Debug: Check if expenses are found
            print(f"Debug: Building ID: {self.building.id}")
            print(f"Debug: Expenses found: {calculator.expenses.count()}")
            for expense in calculator.expenses:
                print(f"Debug: Expense: {expense.title} - {expense.amount}€ ({expense.distribution_type})")
            
            # Verify shares are included
            self.assertIn('shares', result)
            apartment_shares = result['shares']
            
            # Check that apt1 with 120 mills gets correct share of by_mills expenses
            apt1_data = next(apt_data for apt_data in apartment_shares.values() if apt_data['apartment_number'] == 'A1')
            
            # Debug: Check the breakdown
            print(f"Debug: Apt1 breakdown: {apt1_data['breakdown']}")
            print(f"Debug: Apt1 total amount: {apt1_data['total_amount']}")
            
            # Total mills for our test apartments: 120 + 150 + 200 = 470
            # Apt1 share of 500€ elevator expense: (120/470) * 500 = 127.66€ (approximately)
            expected_share = (Decimal('120') / Decimal('470')) * Decimal('500.00')
            self.assertAlmostEqual(
                float(apt1_data['breakdown']['elevator_expenses']),
                float(expected_share),
                places=2
            )
    
    def test_expense_distribution_equal_share(self):
        """Test equal share distribution among apartments"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01', 
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            apartment_shares = result['shares']
            
            # Check equal share distribution for 300€ expense across 3 apartments
            for apt_data in apartment_shares.values():
                # The cleaning expense should be distributed equally (300/3 = 100€ each)
                self.assertEqual(apt_data['breakdown']['equal_share_expenses'], Decimal('100.00'))
    
    def test_expense_distribution_by_meters(self):
        """Test distribution based on apartment square meters"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            apartment_shares = result['shares']
            
            # Total square meters: 80 + 95 + 120 = 295
            # Apt1 (80 sqm) share of 800€: (80/295) * 800 = 216.95€ (approximately)
            apt1_data = next(apt_data for apt_data in apartment_shares.values() if apt_data['apartment_number'] == 'A1')
            
            expected_share = (Decimal('80') / Decimal('295')) * Decimal('800.00')
            self.assertAlmostEqual(
                float(apt1_data['breakdown']['heating_expenses']),
                float(expected_share),
                places=2
            )
    
    def test_reserve_fund_calculation(self):
        """Test reserve fund contribution calculation"""
        with schema_context('demo'):
            # Test with explicit reserve fund amount
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                reserve_fund_monthly_total=Decimal('750.00')
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Verify reserve fund is distributed among apartments
            for apt_id, apt_data in result['shares'].items():
                self.assertGreater(apt_data['breakdown']['reserve_fund_contribution'], Decimal('0.00'))
            
            # Total reserve fund contributions should equal monthly total
            total_contributions = sum(
                apt_data['breakdown']['reserve_fund_contribution'] for apt_data in result['shares'].values()
            )
            self.assertEqual(total_contributions, Decimal('750.00'))
    
    def test_balance_transfer_scenarios(self):
        """Test various balance transfer scenarios"""
        with schema_context('demo'):
            # Create separate apartments for balance testing
            apt_debt = Apartment.objects.create(
                number='C1',
                building=self.building,
                participation_mills=100,
                heating_mills=80,
                square_meters=70,
                current_balance=Decimal('-150.00')  # Has debt
            )
            
            apt_credit = Apartment.objects.create(
                number='C2',
                building=self.building,
                participation_mills=100,
                heating_mills=80,
                square_meters=70,
                current_balance=Decimal('50.00')  # Has credit
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Test apartment with debt
            apt_debt_data = next(apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] == 'C1')
            self.assertEqual(apt_debt_data['previous_balance'], Decimal('-150.00'))
            
            # Test apartment with credit
            apt_credit_data = next(apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] == 'C2')
            self.assertEqual(apt_credit_data['previous_balance'], Decimal('50.00'))
            
            # Test balanced apartment (apt3: 0€)
            apt3_data = next(apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] == 'Γ3')
            self.assertEqual(apt3_data['previous_balance'], Decimal('0.00'))
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        with schema_context('demo'):
            # Test with no expenses
            building_no_expenses = Building.objects.create(
                name='Empty Building',
                address='Empty Address'
            )
            
            calculator = AdvancedCommonExpenseCalculator(building_no_expenses.id)
            result = calculator.calculate_advanced_shares()
            
            # Should handle empty results gracefully
            self.assertIn('shares', result)
            
            # Test with invalid date formats
            calculator_invalid_date = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='invalid-date',
                period_end_date='2025-08-31'
            )
            # Should not crash, falls back to all expenses
            self.assertIsNotNone(calculator_invalid_date.expenses)
    
    def test_greek_apartment_numbers(self):
        """Test handling of Greek alphabet apartment numbers"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Find the Greek apartment (Γ3)
            greek_apt = next(apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] == 'Γ3')
            self.assertIsNotNone(greek_apt)
            self.assertEqual(greek_apt['apartment_number'], 'Γ3')
            
            # Ensure it's processed correctly with proper UTF-8 handling
            self.assertGreater(greek_apt['total_amount'], Decimal('0.00'))
    
    def test_heating_calculations(self):
        """Test heating calculations with different heating types"""
        with schema_context('demo'):
            # Test central heating
            calculator_central = AdvancedCommonExpenseCalculator(
                self.building.id,
                heating_type='central',
                heating_fixed_percentage=40
            )
            
            self.assertEqual(calculator_central.heating_type, 'central')
            self.assertEqual(calculator_central.heating_fixed_percentage, Decimal('0.40'))
            
            # Test autonomous heating
            calculator_autonomous = AdvancedCommonExpenseCalculator(
                self.building.id,
                heating_type='autonomous',
                heating_fixed_percentage=30
            )
            
            self.assertEqual(calculator_autonomous.heating_type, 'autonomous')
            self.assertEqual(calculator_autonomous.heating_fixed_percentage, Decimal('0.30'))
    
    def test_month_without_expenses(self):
        """Test calculation for months with no expenses"""
        with schema_context('demo'):
            # Test for future month with no expenses
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-12-01',
                period_end_date='2025-12-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Should return apartments with zero total amounts (no expenses for this month)
            for apt_data in result['shares'].values():
                # Total amount should be 0 since there are no expenses for December 2025
                self.assertEqual(apt_data['total_amount'], Decimal('0.00'))
    
    def test_financial_precision(self):
        """Test financial precision and rounding"""
        with schema_context('demo'):
            # Create expense that doesn't divide evenly
            expense_precision = Expense.objects.create(
                building=self.building,
                title='Precision Test',
                amount=Decimal('100.01'),  # Won't divide evenly by 3
                date=date(2025, 8, 20),
                distribution_type='equal_share',
                category='miscellaneous'
            )
            
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Verify that all amounts are properly rounded to 2 decimal places
            for apt_data in result['shares'].values():
                # Check breakdown amounts
                for key, amount in apt_data['breakdown'].items():
                    if isinstance(amount, Decimal):
                        # Check that amount has at most 2 decimal places
                        self.assertLessEqual(
                            abs(amount.as_tuple().exponent),
                            2,
                            f"Amount {amount} in {key} has more than 2 decimal places"
                        )


# Integration test for realistic scenario
class TestAdvancedCalculatorIntegration(TestCase):
    """
    Integration tests simulating real-world financial scenarios
    """
    
    def setUp(self):
        """Set up realistic building scenario"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='integration@example.com',
                password='testpass'
            )
            
            # Create realistic building - Αλκμάνος 22 style
            self.building = Building.objects.create(
                name='Αλκμάνος 22, Αθήνα',
                address='Αλκμάνος 22, Αθήνα',
                reserve_fund_goal=Decimal('15000.00'),
                reserve_fund_duration_months=24,
                management_fee_per_apartment=Decimal('75.00')
            )
            
            # Create realistic apartment distribution
            apartments_data = [
                {'number': 'Α1', 'mills': 85, 'heating': 70, 'sqm': 65, 'balance': -234.50},
                {'number': 'Β1', 'mills': 120, 'heating': 100, 'sqm': 85, 'balance': 0.00},
                {'number': 'Γ1', 'mills': 95, 'heating': 85, 'sqm': 70, 'balance': -89.30},
                {'number': 'Δ1', 'mills': 110, 'heating': 95, 'sqm': 80, 'balance': 45.20},
                {'number': 'Α2', 'mills': 130, 'heating': 110, 'sqm': 90, 'balance': -456.80},
            ]
            
            self.apartments = []
            for apt_data in apartments_data:
                apt = Apartment.objects.create(
                    number=apt_data['number'],
                    building=self.building,
                    participation_mills=apt_data['mills'],
                    heating_mills=apt_data['heating'],
                    square_meters=apt_data['sqm'],
                    current_balance=Decimal(str(apt_data['balance']))
                )
                self.apartments.append(apt)
    
    def test_realistic_monthly_calculation(self):
        """Test complete monthly calculation with realistic expenses"""
        with schema_context('demo'):
            # Add realistic monthly expenses
            expenses = [
                {'desc': 'Ηλεκτρικό ρεύμα κοινόχρηστων', 'amount': '180.50', 'method': 'by_participation_mills'},
                {'desc': 'Καθαρισμός κτιρίου', 'amount': '350.00', 'method': 'equal_share'},
                {'desc': 'Συντήρηση ασανσέρ', 'amount': '120.00', 'method': 'equal_share'},
                {'desc': 'Θέρμανση κεντρική', 'amount': '650.00', 'method': 'by_meters'},
                {'desc': 'Διαχειριστικά τέλη', 'amount': '375.00', 'method': 'equal_share'},  # 5 apts × 75€
            ]
            
            for exp in expenses:
                Expense.objects.create(
                    building=self.building,
                    title=exp['desc'],
                    amount=Decimal(exp['amount']),
                    date=date(2025, 8, 15),
                    distribution_type=exp['method'],
                    category='miscellaneous'
                )
            
            # Calculate with realistic reserve fund
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31',
                reserve_fund_monthly_total=Decimal('625.00')  # 15000/24 months
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Verify results structure
            self.assertIn('shares', result)
            self.assertEqual(len(result['shares']), 5)
            
            # Verify financial totals
            total_expenses = sum(Decimal(exp['amount']) for exp in expenses)
            total_distributed = sum(
                apt_data['total_amount'] for apt_data in result['shares'].values()
            )
            
            # Total distributed should equal total expenses
            self.assertAlmostEqual(float(total_distributed), float(total_expenses), places=2)
            
            # Verify reserve fund distribution
            total_reserve_contributions = sum(
                apt_data['breakdown']['reserve_fund_contribution'] for apt_data in result['shares'].values()
            )
            self.assertEqual(total_reserve_contributions, Decimal('625.00'))
            
            # Check that apartments with highest debt are prioritized in calculations
            apt_a2 = next(apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] == 'Α2')
            self.assertEqual(apt_a2['previous_balance'], Decimal('-456.80'))
            
            # Verify Greek apartment names are handled correctly
            greek_apartments = [apt_data for apt_data in result['shares'].values() if apt_data['apartment_number'] in ['Α1', 'Β1', 'Γ1', 'Δ1', 'Α2']]
            self.assertEqual(len(greek_apartments), 5)


if __name__ == '__main__':
    # Run with: python -m pytest backend/financial/tests/test_advanced_calculator.py -v
    pass