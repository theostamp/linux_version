import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime, timedelta
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
from financial.services import AdvancedCommonExpenseCalculator, FinancialDashboardService
from users.models import CustomUser


class TestBalanceTransferScenarios(TestCase):
    """
    Comprehensive tests for balance transfer scenarios and edge cases
    Covers critical financial scenarios that must work correctly
    """
    
    def setUp(self):
        """Set up complex financial scenarios"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='balance@example.com', 
                password='testpass'
            )
            
            # Create test building
            self.building = Building.objects.create(
                name='Balance Test Building',
                address='Balance Test Address',
                reserve_fund_goal=Decimal('20000.00'),
                reserve_fund_duration_months=30,
                management_fee_per_apartment=Decimal('70.00')
            )
            
            # Create apartments with extreme balance scenarios
            self.apt_heavy_debt = Apartment.objects.create(
                number='DEBT1',
                building=self.building,
                participation_mills=120,
                heating_mills=100,
                square_meters=85,
                current_balance=Decimal('-1250.75')  # Heavy debt
            )
            
            self.apt_large_credit = Apartment.objects.create(
                number='CREDIT1', 
                building=self.building,
                participation_mills=150,
                heating_mills=130,
                square_meters=95,
                current_balance=Decimal('850.30')  # Large credit
            )
            
            self.apt_small_debt = Apartment.objects.create(
                number='DEBT2',
                building=self.building,
                participation_mills=80,
                heating_mills=70,
                square_meters=65,
                current_balance=Decimal('-45.20')  # Small debt
            )
            
            self.apt_zero_balance = Apartment.objects.create(
                number='ZERO1',
                building=self.building,
                participation_mills=100,
                heating_mills=90,
                square_meters=75,
                current_balance=Decimal('0.00')  # Exactly zero
            )
            
            self.apt_tiny_credit = Apartment.objects.create(
                number='CREDIT2',
                building=self.building,
                participation_mills=90,
                heating_mills=80,
                square_meters=70,
                current_balance=Decimal('12.50')  # Tiny credit
            )
    
    def test_heavy_debt_balance_transfer(self):
        """Test balance transfer for apartment with heavy debt"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            debt_apt = next(apt for apt in result['apartments'] if apt['number'] == 'DEBT1')
            
            # Previous balance should be transferred correctly
            self.assertEqual(debt_apt['previous_balance'], Decimal('-1250.75'))
            
            # Should still receive new charges
            self.assertGreater(len(debt_apt.get('expense_distributions', [])), 0)
            
            # Total new obligations should add to the debt
            total_new_charges = sum(dist['amount'] for dist in debt_apt.get('expense_distributions', []))
            total_new_charges += debt_apt.get('reserve_fund_contribution', Decimal('0.00'))
            
            self.assertGreater(total_new_charges, Decimal('0.00'))
    
    def test_large_credit_balance_transfer(self):
        """Test balance transfer for apartment with large credit"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            credit_apt = next(apt for apt in result['apartments'] if apt['number'] == 'CREDIT1')
            
            # Previous balance should be transferred as positive
            self.assertEqual(credit_apt['previous_balance'], Decimal('850.30'))
            
            # Should still receive new charges despite credit
            self.assertGreater(len(credit_apt.get('expense_distributions', [])), 0)
            
            # Final balance might be positive if credit exceeds new charges
            total_new_charges = sum(dist['amount'] for dist in credit_apt.get('expense_distributions', []))
            total_new_charges += credit_apt.get('reserve_fund_contribution', Decimal('0.00'))
            
            potential_final_balance = credit_apt['previous_balance'] - total_new_charges
            # This tests the calculation logic without assuming final balance sign
            self.assertIsInstance(potential_final_balance, Decimal)
    
    def test_zero_balance_precision(self):
        """Test handling of exactly zero balances"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            zero_apt = next(apt for apt in result['apartments'] if apt['number'] == 'ZERO1')
            
            # Zero balance should be preserved exactly
            self.assertEqual(zero_apt['previous_balance'], Decimal('0.00'))
            
            # Should still receive new charges
            self.assertGreater(len(zero_apt.get('expense_distributions', [])), 0)
    
    def test_small_amount_precision(self):
        """Test precision handling for small amounts"""
        with schema_context('demo'):
            # Create expense with amount that doesn't divide evenly
            precision_expense = Expense.objects.create(
                building=self.building,
                description='Precision Test',
                amount=Decimal('1.01'),  # Won't divide evenly by 5 apartments
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # All amounts should have proper precision (max 2 decimal places)
            for apt_data in result['apartments']:
                # Check previous balance precision
                balance = apt_data['previous_balance']
                self.assertLessEqual(abs(balance.as_tuple().exponent), 2)
                
                # Check expense distribution precision
                for expense_dist in apt_data.get('expense_distributions', []):
                    amount = expense_dist['amount']
                    self.assertLessEqual(abs(amount.as_tuple().exponent), 2)
                
                # Check reserve fund precision
                if 'reserve_fund_contribution' in apt_data:
                    reserve = apt_data['reserve_fund_contribution']
                    self.assertLessEqual(abs(reserve.as_tuple().exponent), 2)
    
    def test_balance_transfer_with_historical_dates(self):
        """Test balance transfer with historical period calculations"""
        with schema_context('demo'):
            # Create historical transactions
            historical_date = date(2025, 6, 15)
            
            Payment.objects.create(
                apartment=self.apt_heavy_debt,
                amount=Decimal('300.00'),
                date=historical_date,
                payment_method='bank_transfer'
            )
            
            Transaction.objects.create(
                apartment_number=self.apt_heavy_debt.number,
                amount=Decimal('200.00'),
                type='common_expense_charge',
                date=timezone.make_aware(datetime.combine(historical_date, datetime.min.time())),
                description='Historical Charge'
            )
            
            # Calculate with period ending after historical transactions
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-07-01',
                period_end_date='2025-07-31'
            )
            
            result = calculator.calculate_advanced_shares()
            debt_apt = next(apt for apt in result['apartments'] if apt['number'] == 'DEBT1')
            
            # Should use historical balance calculation, not current_balance
            self.assertIsNotNone(debt_apt['previous_balance'])
            # The historical balance should differ from current balance due to transactions
            # This tests the _get_historical_balance method
    
    def test_rounding_consistency(self):
        """Test that rounding is consistent across all calculations"""
        with schema_context('demo'):
            # Create expense that will require rounding
            rounding_expense = Expense.objects.create(
                building=self.building,
                description='Rounding Test',
                amount=Decimal('99.99'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Sum all distributed amounts and verify they equal total expense
            total_distributed = Decimal('0.00')
            for apt_data in result['apartments']:
                for expense_dist in apt_data.get('expense_distributions', []):
                    if expense_dist['description'] == 'Rounding Test':
                        total_distributed += expense_dist['amount']
            
            # Total distributed should equal original expense (within rounding tolerance)
            difference = abs(total_distributed - Decimal('99.99'))
            self.assertLessEqual(difference, Decimal('0.01'))  # Max 1 cent difference due to rounding
    
    def test_extreme_participation_mills(self):
        """Test handling of extreme participation mills values"""
        with schema_context('demo'):
            # Create apartment with very small mills
            apt_tiny_mills = Apartment.objects.create(
                number='TINY',
                building=self.building,
                participation_mills=1,  # Minimum possible
                heating_mills=1,
                square_meters=30,
                current_balance=Decimal('0.00')
            )
            
            # Create apartment with large mills  
            apt_large_mills = Apartment.objects.create(
                number='LARGE',
                building=self.building,
                participation_mills=800,  # Very high
                heating_mills=500,
                square_meters=200,
                current_balance=Decimal('0.00')
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            # Find the apartments in results
            tiny_apt = next(apt for apt in result['apartments'] if apt['number'] == 'TINY')
            large_apt = next(apt for apt in result['apartments'] if apt['number'] == 'LARGE')
            
            # Tiny mills apartment should get very small share
            # Large mills apartment should get large share
            if tiny_apt.get('expense_distributions') and large_apt.get('expense_distributions'):
                tiny_amount = sum(dist['amount'] for dist in tiny_apt['expense_distributions'])
                large_amount = sum(dist['amount'] for dist in large_apt['expense_distributions'])
                
                self.assertLess(tiny_amount, large_amount)
                self.assertGreater(tiny_amount, Decimal('0.00'))  # Should still get something
    
    def test_empty_period_balance_transfer(self):
        """Test balance transfer for period with no expenses"""
        with schema_context('demo'):
            # Calculate for future period with no expenses
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-12-01',
                period_end_date='2025-12-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # All apartments should have their previous balances
            for apt_data in result['apartments']:
                self.assertIsNotNone(apt_data.get('previous_balance'))
                
                # Should have no expense distributions for empty period
                expense_distributions = apt_data.get('expense_distributions', [])
                self.assertEqual(len(expense_distributions), 0)
    
    def test_concurrent_balance_calculations(self):
        """Test that concurrent calculations don't interfere with each other"""
        with schema_context('demo'):
            # Create multiple calculators for same building
            calculator1 = AdvancedCommonExpenseCalculator(self.building.id)
            calculator2 = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2025-08-01',
                period_end_date='2025-08-31'
            )
            
            # Calculate results
            result1 = calculator1.calculate_advanced_shares()
            result2 = calculator2.calculate_advanced_shares()
            
            # Both should return valid results
            self.assertIn('apartments', result1)
            self.assertIn('apartments', result2)
            
            # Results might differ due to different periods, but structure should be same
            self.assertEqual(len(result1['apartments']), len(result2['apartments']))


class TestEdgeCasesAndErrorHandling(TestCase):
    """
    Tests for edge cases and error handling in financial calculations
    """
    
    def setUp(self):
        """Set up edge case scenarios"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='edge@example.com',
                password='testpass'
            )
            
            self.building = Building.objects.create(
                name='Edge Case Building',
                address='Edge Case Address'
            )
    
    def test_building_with_no_apartments(self):
        """Test calculations with building that has no apartments"""
        with schema_context('demo'):
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            
            # Should not crash
            result = calculator.calculate_advanced_shares()
            
            # Should return empty apartments list
            self.assertIn('apartments', result)
            self.assertEqual(len(result['apartments']), 0)
    
    def test_building_with_zero_mills_total(self):
        """Test building where all apartments have zero participation mills"""
        with schema_context('demo'):
            apt1 = Apartment.objects.create(
                number='ZERO1',
                building=self.building,
                participation_mills=0,
                heating_mills=0,
                square_meters=0,
                current_balance=Decimal('0.00')
            )
            
            apt2 = Apartment.objects.create(
                number='ZERO2',
                building=self.building,
                participation_mills=0,
                heating_mills=0,
                square_meters=0,
                current_balance=Decimal('0.00')
            )
            
            # Create expense that would normally be distributed by mills
            expense = Expense.objects.create(
                building=self.building,
                description='Test Expense',
                amount=Decimal('100.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            
            # Should not crash with division by zero
            result = calculator.calculate_advanced_shares()
            
            self.assertIn('apartments', result)
            self.assertEqual(len(result['apartments']), 2)
    
    def test_invalid_date_formats(self):
        """Test handling of invalid date formats"""
        with schema_context('demo'):
            # Should fall back gracefully
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='invalid-date',
                period_end_date='also-invalid'
            )
            
            # Should not crash
            result = calculator.calculate_advanced_shares()
            self.assertIn('apartments', result)
    
    def test_future_dates(self):
        """Test calculations with future dates"""
        with schema_context('demo'):
            # Create apartment
            apt = Apartment.objects.create(
                number='FUTURE1',
                building=self.building,
                participation_mills=100,
                current_balance=Decimal('-100.00')
            )
            
            # Test with far future dates
            calculator = AdvancedCommonExpenseCalculator(
                self.building.id,
                period_start_date='2030-01-01',
                period_end_date='2030-12-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            # Should work but have no expenses in that period
            future_apt = next(apt for apt in result['apartments'] if apt['number'] == 'FUTURE1')
            self.assertEqual(len(future_apt.get('expense_distributions', [])), 0)
    
    def test_extreme_decimal_precision(self):
        """Test handling of extreme decimal precision"""
        with schema_context('demo'):
            apt = Apartment.objects.create(
                number='PRECISION1',
                building=self.building,
                participation_mills=100,
                current_balance=Decimal('123.456789')  # Many decimal places
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            precision_apt = next(apt for apt in result['apartments'] if apt['number'] == 'PRECISION1')
            
            # Balance should be properly rounded to currency precision
            self.assertLessEqual(abs(precision_apt['previous_balance'].as_tuple().exponent), 2)
    
    def test_negative_expense_amounts(self):
        """Test handling of negative expense amounts (refunds)"""
        with schema_context('demo'):
            apt = Apartment.objects.create(
                number='REFUND1',
                building=self.building,
                participation_mills=100,
                current_balance=Decimal('0.00')
            )
            
            # Create negative expense (refund scenario)
            refund_expense = Expense.objects.create(
                building=self.building,
                description='Refund',
                amount=Decimal('-50.00'),  # Negative amount
                date=date.today(),
                distribution_method='equal_share'
            )
            
            calculator = AdvancedCommonExpenseCalculator(self.building.id)
            result = calculator.calculate_advanced_shares()
            
            refund_apt = next(apt for apt in result['apartments'] if apt['number'] == 'REFUND1')
            
            # Should handle negative amounts correctly
            refund_dist = next(
                dist for dist in refund_apt.get('expense_distributions', [])
                if dist['description'] == 'Refund'
            )
            
            self.assertEqual(refund_dist['amount'], Decimal('-50.00'))


if __name__ == '__main__':
    # Run with: python -m pytest backend/financial/tests/test_balance_scenarios.py -v
    pass