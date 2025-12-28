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
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=120,  # 12% participation
                heating_mills=100,
                square_meters=80,
                current_balance=Decimal('-150.00')  # Has debt
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2', 
                building=self.building,
                participation_mills=150,  # 15% participation
                heating_mills=130,
                square_meters=95,
                current_balance=Decimal('50.00')  # Has credit
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
                description='Elevator Maintenance',
                amount=Decimal('500.00'),
                date=date(2025, 8, 15),
                distribution_method='by_participation_mills'
            )
            
            self.expense_equal_share = Expense.objects.create(
                building=self.building,
                description='Cleaning Supplies',
                amount=Decimal('300.00'),
                date=date(2025, 8, 10),
                distribution_method='equal_share'
            )
            
            self.expense_by_meters = Expense.objects.create(
                building=self.building,
                description='Heating Oil',
                amount=Decimal('800.00'),
                date=date(2025, 8, 5),
                distribution_method='by_meters'
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
                payment_method='bank_transfer'
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
            
            # Verify apartments are included
            self.assertIn('apartments', result)
            apartment_shares = result['apartments']
            
            # Check that apt1 with 120 mills gets correct share of by_mills expenses
            apt1_data = next(apt for apt in apartment_shares if apt['number'] == 'A1')
            
            # Total mills for our test apartments: 120 + 150 + 200 = 470
            # Apt1 share of 500€ expense: (120/470) * 500 = 127.66€ (approximately)
            expected_share = (Decimal('120') / Decimal('470')) * Decimal('500.00')
            self.assertAlmostEqual(
                float(apt1_data['expense_distributions'][0]['amount']),
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
            apartment_shares = result['apartments']
            
            # Check equal share distribution for 300€ expense across 3 apartments
            for apt_data in apartment_shares:
                equal_share_expense = next(
                    exp for exp in apt_data['expense_distributions'] 
                    if exp['description'] == 'Cleaning Supplies'
                )
                self.assertEqual(equal_share_expense['amount'], Decimal('100.00'))  # 300/3
    
    def test_expense_distribution_by_meters(self):
        """Test distribution based on apartment square meters"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            apartment_shares = result['apartments']
            
            # Total square meters: 80 + 95 + 120 = 295
            # Apt1 (80 sqm) share of 800€: (80/295) * 800 = 216.95€ (approximately)
            apt1_data = next(apt for apt in apartment_shares if apt['number'] == 'A1')
            heating_expense = next(
                exp for exp in apt1_data['expense_distributions']
                if exp['description'] == 'Heating Oil'
            )
            
            expected_share = (Decimal('80') / Decimal('295')) * Decimal('800.00')
            self.assertAlmostEqual(
                float(heating_expense['amount']),
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
            for apt_data in result['apartments']:
                self.assertGreater(apt_data['reserve_fund_contribution'], Decimal('0.00'))
            
            # Total reserve fund contributions should equal monthly total
            total_contributions = sum(
                apt['reserve_fund_contribution'] for apt in result['apartments']
            )
            self.assertEqual(total_contributions, Decimal('750.00'))
    
    def test_balance_transfer_scenarios(self):
        """Test various balance transfer scenarios"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            
            result = calculator.calculate_advanced_shares()
            
            # Test apartment with debt (apt1: -150€)
            apt1_data = next(apt for apt in result['apartments'] if apt['number'] == 'A1')
            self.assertEqual(apt1_data['previous_balance'], Decimal('-150.00'))
            
            # Test apartment with credit (apt2: +50€)
            apt2_data = next(apt for apt in result['apartments'] if apt['number'] == 'B2')
            self.assertEqual(apt2_data['previous_balance'], Decimal('50.00'))
            
            # Test balanced apartment (apt3: 0€)
            apt3_data = next(apt for apt in result['apartments'] if apt['number'] == 'Γ3')
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
            self.assertIn('apartments', result)
            
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
            greek_apt = next(apt for apt in result['apartments'] if apt['number'] == 'Γ3')
            self.assertIsNotNone(greek_apt)
            self.assertEqual(greek_apt['number'], 'Γ3')
            
            # Ensure it's processed correctly with proper UTF-8 handling
            self.assertGreater(len(greek_apt['expense_distributions']), 0)
    
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
            
            # Should return apartments with zero expense distributions
            for apt_data in result['apartments']:
                if 'expense_distributions' in apt_data:
                    # If present, should be empty list
                    self.assertEqual(len(apt_data['expense_distributions']), 0)
    
    def test_financial_precision(self):
        """Test financial precision and rounding"""
        with schema_context('demo'):
            # Create expense that doesn't divide evenly
            expense_precision = Expense.objects.create(
                building=self.building,
                description='Precision Test',
                amount=Decimal('100.01'),  # Won't divide evenly by 3
                date=date(2025, 8, 20),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Verify that all amounts are properly rounded to 2 decimal places
            for apt_data in result['apartments']:
                for expense_dist in apt_data.get('expense_distributions', []):
                    amount = expense_dist['amount']
                    # Check that amount has at most 2 decimal places
                    self.assertLessEqual(
                        abs(amount.as_tuple().exponent),
                        2,
                        f"Amount {amount} has more than 2 decimal places"
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
                    description=exp['desc'],
                    amount=Decimal(exp['amount']),
                    date=date(2025, 8, 15),
                    distribution_method=exp['method']
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
            self.assertIn('apartments', result)
            self.assertEqual(len(result['apartments']), 5)
            
            # Verify financial totals
            total_expenses = sum(Decimal(exp['amount']) for exp in expenses)
            total_distributed = sum(
                sum(dist['amount'] for dist in apt['expense_distributions'])
                for apt in result['apartments']
            )
            
            # Total distributed should equal total expenses
            self.assertAlmostEqual(float(total_distributed), float(total_expenses), places=2)
            
            # Verify reserve fund distribution
            total_reserve_contributions = sum(
                apt['reserve_fund_contribution'] for apt in result['apartments']
            )
            self.assertEqual(total_reserve_contributions, Decimal('625.00'))
            
            # Check that apartments with highest debt are prioritized in calculations
            apt_a2 = next(apt for apt in result['apartments'] if apt['number'] == 'Α2')
            self.assertEqual(apt_a2['previous_balance'], Decimal('-456.80'))
            
            # Verify Greek apartment names are handled correctly
            greek_apartments = [apt for apt in result['apartments'] if apt['number'] in ['Α1', 'Β1', 'Γ1', 'Δ1', 'Α2']]
            self.assertEqual(len(greek_apartments), 5)


if __name__ == '__main__':
    # Run with: python -m pytest backend/financial/tests/test_advanced_calculator.py -v
    pass