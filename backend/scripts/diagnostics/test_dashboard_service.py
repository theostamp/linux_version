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
from financial.services import FinancialDashboardService
from users.models import CustomUser


class TestFinancialDashboardService(TestCase):
    """
    Comprehensive tests for FinancialDashboardService
    Tests cover:
    - Summary calculations with and without specific months
    - Cash flow analysis
    - Apartment balances with different scenarios
    - Reserve fund calculations
    - Management fee calculations
    """
    
    def setUp(self):
        """Set up test data with realistic financial scenarios"""
        with schema_context('demo'):
            # Create test user
            self.user = CustomUser.objects.create_user(
                email='dashboard@example.com',
                password='testpass'
            )
            
            # Create test building with management fees
            self.building = Building.objects.create(
                name='Dashboard Test Building',
                address='Test Dashboard Address',
                reserve_fund_goal=Decimal('12000.00'),
                reserve_fund_duration_months=24,
                management_fee_per_apartment=Decimal('60.00'),
                reserve_fund_start_date=date(2025, 1, 1)
            )
            
            # Create apartments with varied financial situations
            self.apt1 = Apartment.objects.create(
                number='A1',
                building=self.building,
                participation_mills=100,
                heating_mills=90,
                square_meters=75,
                current_balance=Decimal('-320.50')  # Significant debt
            )
            
            self.apt2 = Apartment.objects.create(
                number='B2',
                building=self.building,
                participation_mills=130,
                heating_mills=110,
                square_meters=85,
                current_balance=Decimal('150.00')  # Credit balance
            )
            
            self.apt3 = Apartment.objects.create(
                number='C3',
                building=self.building,
                participation_mills=80,
                heating_mills=70,
                square_meters=65,
                current_balance=Decimal('-75.20')  # Small debt
            )
            
            # Create test expenses for different months
            self.expense_current_month = Expense.objects.create(
                building=self.building,
                description='Current Month Expense',
                amount=Decimal('450.00'),
                date=date.today(),
                distribution_method='by_participation_mills'
            )
            
            self.expense_last_month = Expense.objects.create(
                building=self.building,
                description='Last Month Expense',
                amount=Decimal('380.00'),
                date=date(2025, 7, 15),
                distribution_method='equal_share'
            )
            
            # Create some transactions for cash flow analysis
            Transaction.objects.create(
                apartment_number=self.apt1.number,
                amount=Decimal('200.00'),
                type='common_expense_charge',
                date=timezone.now(),
                description='August Common Expenses'
            )
            
            Transaction.objects.create(
                apartment_number=self.apt1.number,
                amount=Decimal('150.00'),
                type='payment_received',
                date=timezone.now(),
                description='Partial Payment'
            )
    
    def test_service_initialization(self):
        """Test dashboard service initializes correctly"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            self.assertEqual(service.building_id, self.building.id)
            self.assertEqual(service.building, self.building)
    
    def test_get_summary_without_month(self):
        """Test summary calculation without specific month"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            summary = service.get_summary()
            
            # Verify summary structure
            self.assertIn('apartment_obligations', summary)
            self.assertIn('total_obligations', summary)
            self.assertIn('current_month_expenses', summary)
            self.assertIn('reserve_fund_contribution', summary)
            
            # Test apartment obligations calculation
            # Should be sum of negative balances: |-320.50| + |0| + |-75.20| = 395.70
            expected_obligations = abs(self.apt1.current_balance) + abs(self.apt3.current_balance)
            self.assertEqual(summary['apartment_obligations'], expected_obligations)
            
            # Test total obligations includes management fees
            # Management fees = 3 apartments × 60€ = 180€
            expected_total = expected_obligations + Decimal('180.00')  # + management fees
            self.assertEqual(summary['total_obligations'], expected_total)
            
            # Test reserve fund contribution calculation
            # Should be 12000 / 24 = 500€ per month
            expected_reserve = Decimal('500.00')
            self.assertEqual(summary['reserve_fund_contribution'], expected_reserve)
    
    def test_get_summary_with_specific_month(self):
        """Test summary calculation for specific month"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # Test with July 2025
            summary_july = service.get_summary(month='2025-07')
            
            # Should include July expense in current month expenses
            self.assertGreater(summary_july['current_month_expenses'], Decimal('0.00'))
            
            # Test with future month (should have no expenses)
            summary_future = service.get_summary(month='2025-12')
            self.assertEqual(summary_future['current_month_expenses'], Decimal('0.00'))
    
    def test_get_summary_invalid_month_format(self):
        """Test summary with invalid month format falls back gracefully"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # Test with invalid format
            summary = service.get_summary(month='invalid-month')
            
            # Should not crash and return valid summary
            self.assertIn('apartment_obligations', summary)
            self.assertIsInstance(summary['current_month_expenses'], Decimal)
    
    def test_get_cash_flow_analysis(self):
        """Test cash flow analysis calculation"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            cash_flow = service.get_cash_flow_analysis()
            
            # Verify cash flow structure
            self.assertIn('total_income', cash_flow)
            self.assertIn('total_expenses', cash_flow)
            self.assertIn('net_cash_flow', cash_flow)
            self.assertIn('monthly_breakdown', cash_flow)
            
            # Verify calculations
            self.assertGreaterEqual(cash_flow['total_income'], Decimal('0.00'))
            self.assertGreaterEqual(cash_flow['total_expenses'], Decimal('0.00'))
            
            # Net cash flow should be income - expenses
            expected_net = cash_flow['total_income'] - cash_flow['total_expenses']
            self.assertEqual(cash_flow['net_cash_flow'], expected_net)
    
    def test_get_apartment_balances_summary(self):
        """Test apartment balances summary"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            balances = service.get_apartment_balances_summary()
            
            # Verify structure
            self.assertIn('apartments', balances)
            self.assertIn('total_debt', balances)
            self.assertIn('total_credit', balances)
            self.assertIn('net_balance', balances)
            
            # Should have 3 apartments
            self.assertEqual(len(balances['apartments']), 3)
            
            # Test total debt calculation (sum of negative balances)
            expected_debt = abs(self.apt1.current_balance) + abs(self.apt3.current_balance)
            self.assertEqual(balances['total_debt'], expected_debt)
            
            # Test total credit calculation  
            expected_credit = self.apt2.current_balance
            self.assertEqual(balances['total_credit'], expected_credit)
            
            # Net balance should be credit - debt
            expected_net = expected_credit - expected_debt
            self.assertEqual(balances['net_balance'], expected_net)
    
    def test_apartment_balances_individual_data(self):
        """Test individual apartment data in balance summary"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            balances = service.get_apartment_balances_summary()
            
            # Find apartment A1 data
            apt1_data = next(apt for apt in balances['apartments'] if apt['number'] == 'A1')
            
            self.assertEqual(apt1_data['current_balance'], self.apt1.current_balance)
            self.assertEqual(apt1_data['participation_mills'], self.apt1.participation_mills)
            
            # Test balance status determination
            self.assertEqual(apt1_data['balance_status'], 'debt')  # Negative balance
            
            # Find apartment B2 data  
            apt2_data = next(apt for apt in balances['apartments'] if apt['number'] == 'B2')
            self.assertEqual(apt2_data['balance_status'], 'credit')  # Positive balance
    
    def test_reserve_fund_calculations(self):
        """Test reserve fund related calculations"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # Test with building that has reserve fund settings
            summary = service.get_summary()
            
            # Should calculate monthly contribution: 12000 / 24 = 500€
            self.assertEqual(summary['reserve_fund_contribution'], Decimal('500.00'))
            
            # Test progress calculation if implemented
            if 'reserve_fund_progress' in summary:
                self.assertGreaterEqual(summary['reserve_fund_progress'], 0)
                self.assertLessEqual(summary['reserve_fund_progress'], 100)
    
    def test_management_fee_calculations(self):
        """Test management fee calculations"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            summary = service.get_summary()
            
            # Management fees should be included in total obligations
            # 3 apartments × 60€ = 180€
            expected_management_total = Decimal('180.00')
            
            # Total obligations should include management fees
            apartment_debts = abs(self.apt1.current_balance) + abs(self.apt3.current_balance)
            expected_total_obligations = apartment_debts + expected_management_total
            
            self.assertEqual(summary['total_obligations'], expected_total_obligations)
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        with schema_context('demo'):
            # Test with building with no apartments
            empty_building = Building.objects.create(
                name='Empty Building',
                address='Empty Address'
            )
            
            service_empty = FinancialDashboardService(empty_building.id)
            summary_empty = service_empty.get_summary()
            
            # Should handle gracefully
            self.assertEqual(summary_empty['apartment_obligations'], Decimal('0.00'))
            self.assertEqual(summary_empty['total_obligations'], Decimal('0.00'))
            
            # Test cash flow with no transactions
            cash_flow_empty = service_empty.get_cash_flow_analysis()
            self.assertEqual(cash_flow_empty['total_income'], Decimal('0.00'))
            self.assertEqual(cash_flow_empty['total_expenses'], Decimal('0.00'))
    
    def test_month_edge_cases(self):
        """Test month-specific calculations edge cases"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # Test December month (year boundary)
            summary_dec = service.get_summary(month='2025-12')
            self.assertIsInstance(summary_dec['current_month_expenses'], Decimal)
            
            # Test February in leap year
            summary_feb = service.get_summary(month='2024-02')
            self.assertIsInstance(summary_feb['current_month_expenses'], Decimal)
            
            # Test single digit month
            summary_jan = service.get_summary(month='2025-1')  # Should handle single digit
            self.assertIsInstance(summary_jan['current_month_expenses'], Decimal)
    
    def test_data_consistency(self):
        """Test data consistency across different methods"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # Get data from different methods
            summary = service.get_summary()
            balances = service.get_apartment_balances_summary()
            
            # Apartment obligations should match between methods
            summary_obligations = summary['apartment_obligations']
            balances_debt = balances['total_debt']
            
            self.assertEqual(summary_obligations, balances_debt)
            
            # Number of apartments should be consistent
            apartments_count = len(balances['apartments'])
            expected_management_cost = apartments_count * self.building.management_fee_per_apartment
            
            # Management cost should be reflected in total obligations
            expected_total = summary_obligations + expected_management_cost
            self.assertEqual(summary['total_obligations'], expected_total)


# Performance and Integration Tests
class TestFinancialDashboardPerformance(TestCase):
    """
    Performance tests for FinancialDashboardService with larger datasets
    """
    
    def setUp(self):
        """Set up larger test dataset"""
        with schema_context('demo'):
            self.user = CustomUser.objects.create_user(
                email='performance@example.com',
                password='testpass'
            )
            
            # Create building with many apartments (realistic large building)
            self.building = Building.objects.create(
                name='Large Building Test',
                address='Performance Test Address',
                reserve_fund_goal=Decimal('50000.00'),
                reserve_fund_duration_months=36,
                management_fee_per_apartment=Decimal('80.00')
            )
            
            # Create 50 apartments with varied data
            self.apartments = []
            for i in range(1, 51):
                apt = Apartment.objects.create(
                    number=f'A{i}',
                    building=self.building,
                    participation_mills=i * 2,  # Varied mills
                    heating_mills=i + 50,
                    square_meters=60 + (i % 30),  # 60-90 sqm range
                    current_balance=Decimal(str((-200 + (i * 10)) % 1000 - 500))  # Varied balances
                )
                self.apartments.append(apt)
                
                # Add some transactions for each apartment
                for j in range(5):  # 5 transactions per apartment
                    Transaction.objects.create(
                        apartment_number=apt.number,
                        amount=Decimal(str(50 + (j * 10))),
                        type='common_expense_charge' if j % 2 == 0 else 'payment_received',
                        date=timezone.now(),
                        description=f'Transaction {j} for {apt.number}'
                    )
    
    def test_large_building_summary_performance(self):
        """Test performance with large building (50+ apartments)"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # This should complete efficiently even with 50 apartments
            summary = service.get_summary()
            
            # Verify all data is calculated
            self.assertIn('apartment_obligations', summary)
            self.assertIn('total_obligations', summary)
            
            # Management fees should be 50 × 80€ = 4000€
            expected_management_total = Decimal('4000.00')
            
            # Total obligations should include management fees
            self.assertGreaterEqual(summary['total_obligations'], expected_management_total)
    
    def test_large_building_balances_performance(self):
        """Test apartment balances calculation with many apartments"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            balances = service.get_apartment_balances_summary()
            
            # Should return data for all 50 apartments
            self.assertEqual(len(balances['apartments']), 50)
            
            # All apartments should have required fields
            for apt_data in balances['apartments']:
                self.assertIn('number', apt_data)
                self.assertIn('current_balance', apt_data)
                self.assertIn('balance_status', apt_data)
                self.assertIn('participation_mills', apt_data)
    
    def test_cash_flow_with_many_transactions(self):
        """Test cash flow analysis with many transactions (250 total)"""
        with schema_context('demo'):
            service = FinancialDashboardService(self.building.id)
            
            # 50 apartments × 5 transactions = 250 transactions
            cash_flow = service.get_cash_flow_analysis()
            
            # Should process all transactions efficiently
            self.assertIn('total_income', cash_flow)
            self.assertIn('total_expenses', cash_flow)
            self.assertIn('net_cash_flow', cash_flow)
            
            # With our test data pattern, should have both income and expenses
            self.assertGreater(cash_flow['total_income'], Decimal('0.00'))
            self.assertGreater(cash_flow['total_expenses'], Decimal('0.00'))


if __name__ == '__main__':
    # Run with: python -m pytest backend/financial/tests/test_dashboard_service.py -v
    pass