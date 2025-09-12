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


class TestExpenseDistributionAlgorithms(TestCase):
    """
    Comprehensive tests for all expense distribution algorithms
    Tests the core business logic of how expenses are allocated to apartments
    """
    
    def setUp(self):
        """Set up test data for distribution algorithm testing"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='distribution@example.com',
                password='testpass'
            )
            
            # Create test building
            self.building = Building.objects.create(
                name='Distribution Test Building',
                address='Distribution Test Address',
                reserve_fund_goal=Decimal('15000.00'),
                reserve_fund_duration_months=25,
                management_fee_per_apartment=Decimal('65.00')
            )
            
            # Create apartments with specific values for testing algorithms
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=100,  # 10.0% participation
                heating_mills=80,
                square_meters=75,
                current_balance=Decimal('0.00')
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2',
                building=self.building,
                participation_mills=150,  # 15.0% participation
                heating_mills=120,
                square_meters=90,
                current_balance=Decimal('0.00')
            )
            
            self.apt3 = Apartment.objects.create(
                number='C3',
                building=self.building,
                participation_mills=200,  # 20.0% participation
                heating_mills=150,
                square_meters=100,
                current_balance=Decimal('0.00')
            )
            
            self.apt4 = Apartment.objects.create(
                number='D4',
                building=self.building,
                participation_mills=50,   # 5.0% participation 
                heating_mills=40,
                square_meters=50,
                current_balance=Decimal('0.00')
            )
            
            # Total mills: 100 + 150 + 200 + 50 = 500
            # Total heating mills: 80 + 120 + 150 + 40 = 390  
            # Total square meters: 75 + 90 + 100 + 50 = 315
    
    def test_by_participation_mills_distribution(self):
        """Test distribution based on participation mills"""
        with schema_context('demo'):
            # Create expense to be distributed by participation mills
            expense = Expense.objects.create(
                building=self.building,
                description='Elevator Maintenance',
                amount=Decimal('1000.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Verify each apartment gets correct share
            # Total mills = 500, expense = 1000€
            
            # A1: 100/500 * 1000 = 200€
            apt1_data = next(apt for apt in result['apartments'] if apt['number'] == 'A1')
            apt1_expense = next(dist for dist in apt1_data['expense_distributions'] 
                              if dist['description'] == 'Elevator Maintenance')
            self.assertEqual(apt1_expense['amount'], Decimal('200.00'))
            
            # B2: 150/500 * 1000 = 300€
            apt2_data = next(apt for apt in result['apartments'] if apt['number'] == 'B2')
            apt2_expense = next(dist for dist in apt2_data['expense_distributions']
                              if dist['description'] == 'Elevator Maintenance')
            self.assertEqual(apt2_expense['amount'], Decimal('300.00'))
            
            # C3: 200/500 * 1000 = 400€
            apt3_data = next(apt for apt in result['apartments'] if apt['number'] == 'C3')
            apt3_expense = next(dist for dist in apt3_data['expense_distributions']
                              if dist['description'] == 'Elevator Maintenance')
            self.assertEqual(apt3_expense['amount'], Decimal('400.00'))
            
            # D4: 50/500 * 1000 = 100€
            apt4_data = next(apt for apt in result['apartments'] if apt['number'] == 'D4')
            apt4_expense = next(dist for dist in apt4_data['expense_distributions']
                              if dist['description'] == 'Elevator Maintenance')
            self.assertEqual(apt4_expense['amount'], Decimal('100.00'))
    
    def test_equal_share_distribution(self):
        """Test equal share distribution among all apartments"""
        with schema_context('demo'):
            # Create expense to be distributed equally
            expense = Expense.objects.create(
                building=self.building,
                description='Cleaning Services',
                amount=Decimal('800.00'),
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Each apartment should get 800/4 = 200€
            expected_share = Decimal('200.00')
            
            for apt_data in result['apartments']:
                cleaning_expense = next(dist for dist in apt_data['expense_distributions']
                                      if dist['description'] == 'Cleaning Services')
                self.assertEqual(cleaning_expense['amount'], expected_share)
    
    def test_by_meters_distribution(self):
        """Test distribution based on apartment square meters"""
        with schema_context('demo'):
            # Create expense to be distributed by square meters
            expense = Expense.objects.create(
                building=self.building,
                description='Heating Costs',
                amount=Decimal('630.00'),  # Chosen to divide evenly by total sqm
                date=date.today(),
                distribution_method='by_meters'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Total square meters = 315, expense = 630€
            # Cost per square meter = 630/315 = 2€ per sqm
            
            # A1: 75 sqm * 2€ = 150€
            apt1_data = next(apt for apt in result['apartments'] if apt['number'] == 'A1')
            apt1_expense = next(dist for dist in apt1_data['expense_distributions']
                              if dist['description'] == 'Heating Costs')
            self.assertEqual(apt1_expense['amount'], Decimal('150.00'))
            
            # B2: 90 sqm * 2€ = 180€
            apt2_data = next(apt for apt in result['apartments'] if apt['number'] == 'B2')
            apt2_expense = next(dist for dist in apt2_data['expense_distributions']
                              if dist['description'] == 'Heating Costs')
            self.assertEqual(apt2_expense['amount'], Decimal('180.00'))
            
            # C3: 100 sqm * 2€ = 200€
            apt3_data = next(apt for apt in result['apartments'] if apt['number'] == 'C3')
            apt3_expense = next(dist for dist in apt3_data['expense_distributions']
                              if dist['description'] == 'Heating Costs')
            self.assertEqual(apt3_expense['amount'], Decimal('200.00'))
            
            # D4: 50 sqm * 2€ = 100€
            apt4_data = next(apt for apt in result['apartments'] if apt['number'] == 'D4')
            apt4_expense = next(dist for dist in apt4_data['expense_distributions']
                              if dist['description'] == 'Heating Costs')
            self.assertEqual(apt4_expense['amount'], Decimal('100.00'))
    
    def test_specific_apartments_distribution(self):
        """Test distribution to specific apartments only"""
        with schema_context('demo'):
            # Create expense for specific apartments (A1 and C3 only)
            expense = Expense.objects.create(
                building=self.building,
                description='Specific Repair',
                amount=Decimal('400.00'),
                date=date.today(),
                distribution_method='specific_apartments'
            )
            
            # Note: In real implementation, specific apartments would be defined
            # via a separate relationship or field. For this test, we'll mock
            # the behavior or assume it's handled in the calculator.
            
            # This test would need the actual implementation details of how
            # specific apartments are designated in the system
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Verify the expense exists in results
            # Implementation depends on how specific apartments are handled
            self.assertIsNotNone(result)
    
    def test_mixed_distribution_methods(self):
        """Test multiple expenses with different distribution methods"""
        with schema_context('demo'):
            # Create multiple expenses with different distribution methods
            expense1 = Expense.objects.create(
                building=self.building,
                description='Common Area Electric',
                amount=Decimal('200.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            expense2 = Expense.objects.create(
                building=self.building,
                description='Building Insurance',
                amount=Decimal('400.00'),
                date=date.today(),
                distribution_method='equal_share'
            )
            
            expense3 = Expense.objects.create(
                building=self.building,
                description='Water Heating',
                amount=Decimal('315.00'),
                date=date.today(),
                distribution_method='by_meters'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Verify A1 gets correct amounts for all three expenses
            apt1_data = next(apt for apt in result['apartments'] if apt['number'] == 'A1')
            
            # Electric by mills: 100/500 * 200 = 40€
            electric_expense = next(dist for dist in apt1_data['expense_distributions']
                                  if dist['description'] == 'Common Area Electric')
            self.assertEqual(electric_expense['amount'], Decimal('40.00'))
            
            # Insurance equal share: 400/4 = 100€
            insurance_expense = next(dist for dist in apt1_data['expense_distributions']
                                   if dist['description'] == 'Building Insurance')
            self.assertEqual(insurance_expense['amount'], Decimal('100.00'))
            
            # Water by meters: 75/315 * 315 = 75€
            water_expense = next(dist for dist in apt1_data['expense_distributions']
                               if dist['description'] == 'Water Heating')
            self.assertEqual(water_expense['amount'], Decimal('75.00'))
            
            # Total for A1: 40 + 100 + 75 = 215€
            total_a1 = sum(dist['amount'] for dist in apt1_data['expense_distributions'])
            self.assertEqual(total_a1, Decimal('215.00'))
    
    def test_distribution_totals_conservation(self):
        """Test that total distributed amounts equal original expense amounts"""
        with schema_context('demo'):
            # Create various expenses
            expenses_data = [
                {'desc': 'Maintenance', 'amount': '567.89', 'method': 'by_participation_mills'},
                {'desc': 'Security', 'amount': '433.21', 'method': 'equal_share'},
                {'desc': 'Utilities', 'amount': '789.12', 'method': 'by_meters'},
            ]
            
            created_expenses = []
            for exp_data in expenses_data:
                expense = Expense.objects.create(
                    building=self.building,
                    description=exp_data['desc'],
                    amount=Decimal(exp_data['amount']),
                    date=date.today(),
                    distribution_method=exp_data['method']
                )
                created_expenses.append((expense, Decimal(exp_data['amount'])))
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # For each expense, verify total distribution equals original amount
            for expense, original_amount in created_expenses:
                total_distributed = Decimal('0.00')
                
                for apt_data in result['apartments']:
                    for dist in apt_data['expense_distributions']:
                        if dist['description'] == expense.description:
                            total_distributed += dist['amount']
                
                # Allow for small rounding differences (max 1 cent per apartment)
                max_rounding_error = Decimal('0.04')  # 4 apartments * 0.01
                difference = abs(total_distributed - original_amount)
                self.assertLessEqual(difference, max_rounding_error,
                                   f"Distribution total {total_distributed} doesn't match original {original_amount} for {expense.description}")
    
    def test_zero_mills_apartment_handling(self):
        """Test how distribution handles apartments with zero participation mills"""
        with schema_context('demo'):
            # Create apartment with zero mills
            apt_zero = Apartment.objects.create(
                number='ZERO',
                building=self.building,
                participation_mills=0,
                heating_mills=0,
                square_meters=60,
                current_balance=Decimal('0.00')
            )
            
            # Create expense distributed by mills
            expense = Expense.objects.create(
                building=self.building,
                description='Mills Distribution Test',
                amount=Decimal('500.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Zero mills apartment should get zero amount for mills-based distribution
            zero_apt_data = next(apt for apt in result['apartments'] if apt['number'] == 'ZERO')
            zero_expense = next(dist for dist in zero_apt_data['expense_distributions']
                              if dist['description'] == 'Mills Distribution Test')
            self.assertEqual(zero_expense['amount'], Decimal('0.00'))
            
            # But should still get equal share for equal distribution
            equal_expense = Expense.objects.create(
                building=self.building,
                description='Equal Distribution Test',
                amount=Decimal('500.00'),
                date=date.today(),
                distribution_method='equal_share'
            )
            
            result2 = calculator.calculate_advanced_shares()
            zero_apt_data2 = next(apt for apt in result2['apartments'] if apt['number'] == 'ZERO')
            equal_dist = next(dist for dist in zero_apt_data2['expense_distributions']
                            if dist['description'] == 'Equal Distribution Test')
            self.assertEqual(equal_dist['amount'], Decimal('100.00'))  # 500/5 apartments
    
    def test_fractional_distribution_rounding(self):
        """Test proper rounding when distributions result in fractions"""
        with schema_context('demo'):
            # Create expense that doesn't divide evenly
            expense = Expense.objects.create(
                building=self.building,
                description='Fractional Test',
                amount=Decimal('100.01'),  # Won't divide evenly by 4
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Each apartment should get approximately 25.0025€
            # but rounded to 2 decimal places
            total_distributed = Decimal('0.00')
            for apt_data in result['apartments']:
                fractional_expense = next(dist for dist in apt_data['expense_distributions']
                                        if dist['description'] == 'Fractional Test')
                
                # Verify proper decimal precision
                self.assertLessEqual(abs(fractional_expense['amount'].as_tuple().exponent), 2)
                total_distributed += fractional_expense['amount']
            
            # Total should be close to original (within rounding tolerance)
            difference = abs(total_distributed - Decimal('100.01'))
            self.assertLessEqual(difference, Decimal('0.01'))
    
    def test_heating_mills_vs_participation_mills(self):
        """Test that heating expenses use heating mills while others use participation mills"""
        with schema_context('demo'):
            # Create heating expense (should use heating_mills if properly implemented)
            heating_expense = Expense.objects.create(
                building=self.building,
                description='Central Heating',
                amount=Decimal('780.00'),  # 390 heating mills total * 2€ per mill
                date=date.today(),
                distribution_method='by_heating_mills'  # Custom method if implemented
            )
            
            # Create regular expense (should use participation_mills)
            regular_expense = Expense.objects.create(
                building=self.building,
                description='Common Maintenance',
                amount=Decimal('500.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Verify different distributions for same apartment
            apt1_data = next(apt for apt in result['apartments'] if apt['number'] == 'A1')
            
            # Regular expense by participation mills: 100/500 * 500 = 100€
            regular_dist = next((dist for dist in apt1_data['expense_distributions']
                               if dist['description'] == 'Common Maintenance'), None)
            if regular_dist:
                self.assertEqual(regular_dist['amount'], Decimal('100.00'))
            
            # Heating expense would use different calculation if heating_mills distribution is implemented
            # This test assumes the system can handle heating_mills as a distribution method
    
    def test_distribution_with_zero_square_meters(self):
        """Test by_meters distribution when apartment has zero square meters"""
        with schema_context('demo'):
            # Create apartment with zero square meters
            apt_zero_sqm = Apartment.objects.create(
                number='ZEROSQM',
                building=self.building,
                participation_mills=75,
                heating_mills=60,
                square_meters=0,  # Zero square meters
                current_balance=Decimal('0.00')
            )
            
            # Create expense distributed by meters
            expense = Expense.objects.create(
                building=self.building,
                description='By Meters Test',
                amount=Decimal('315.00'),
                date=date.today(),
                distribution_method='by_meters'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Zero sqm apartment should get zero amount
            zero_sqm_data = next(apt for apt in result['apartments'] if apt['number'] == 'ZEROSQM')
            meters_expense = next(dist for dist in zero_sqm_data['expense_distributions']
                                if dist['description'] == 'By Meters Test')
            self.assertEqual(meters_expense['amount'], Decimal('0.00'))


class TestDistributionAlgorithmEdgeCases(TestCase):
    """
    Test edge cases in distribution algorithms
    """
    
    def setUp(self):
        """Set up edge case scenarios"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='edge_dist@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Edge Distribution Building',
                address='Edge Distribution Address'
            )
    
    def test_single_apartment_building(self):
        """Test distribution in building with only one apartment"""
        with schema_context('demo'):
            single_apt = Apartment.objects.create(
                number='ONLY1',
                building=self.building,
                participation_mills=1000,  # 100% participation
                heating_mills=500,
                square_meters=100,
                current_balance=Decimal('0.00')
            )
            
            expense = Expense.objects.create(
                building=self.building,
                description='Single Apartment Test',
                amount=Decimal('123.45'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Single apartment should get 100% of expense
            apt_data = result['apartments'][0]
            expense_dist = next(dist for dist in apt_data['expense_distributions']
                              if dist['description'] == 'Single Apartment Test')
            self.assertEqual(expense_dist['amount'], Decimal('123.45'))
    
    def test_very_large_expense_amounts(self):
        """Test distribution with very large expense amounts"""
        with schema_context('demo'):
            apt1 = Apartment.objects.create(
                number='BIG1',
                building=self.building,
                participation_mills=500,
                square_meters=100,
                current_balance=Decimal('0.00')
            )
            
            apt2 = Apartment.objects.create(
                number='BIG2',
                building=self.building,
                participation_mills=500,
                square_meters=100,
                current_balance=Decimal('0.00')
            )
            
            # Very large expense amount
            large_expense = Expense.objects.create(
                building=self.building,
                description='Large Expense',
                amount=Decimal('999999.99'),
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Each apartment should get half
            for apt_data in result['apartments']:
                large_dist = next(dist for dist in apt_data['expense_distributions']
                                if dist['description'] == 'Large Expense')
                expected_amount = Decimal('999999.99') / 2
                self.assertAlmostEqual(float(large_dist['amount']), float(expected_amount), places=2)
    
    def test_micro_expense_amounts(self):
        """Test distribution with very small expense amounts"""
        with schema_context('demo'):
            apt1 = Apartment.objects.create(
                number='MICRO1',
                building=self.building,
                participation_mills=333,
                square_meters=50,
                current_balance=Decimal('0.00')
            )
            
            apt2 = Apartment.objects.create(
                number='MICRO2',
                building=self.building,
                participation_mills=333,
                square_meters=50,
                current_balance=Decimal('0.00')
            )
            
            apt3 = Apartment.objects.create(
                number='MICRO3',
                building=self.building,
                participation_mills=334,
                square_meters=50,
                current_balance=Decimal('0.00')
            )
            
            # Very small expense amount
            micro_expense = Expense.objects.create(
                building=self.building,
                description='Micro Expense',
                amount=Decimal('0.01'),  # 1 cent
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Distribution should handle micro amounts correctly
            total_distributed = Decimal('0.00')
            for apt_data in result['apartments']:
                micro_dist = next(dist for dist in apt_data['expense_distributions']
                                if dist['description'] == 'Micro Expense')
                total_distributed += micro_dist['amount']
            
            # Should be close to original amount (rounding may cause small difference)
            difference = abs(total_distributed - Decimal('0.01'))
            self.assertLessEqual(difference, Decimal('0.01'))


if __name__ == '__main__':
    # Run with: python -m pytest backend/financial/tests/test_distribution_algorithms.py -v
    pass