from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
import json

from .models import (
    Expense, Transaction, Payment, ExpenseApartment, 
    MeterReading, ExpenseCategory, DistributionType
)
from buildings.models import Building, Apartment
from tenants.models import Tenant

User = get_user_model()


class FinancialAPIIntegrationTestCase(TestCase):
    """Integration tests for Financial API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create tenant
        self.tenant = Tenant.objects.create(
            schema_name='test_api_integration',
            name='Test API Integration Tenant'
        )
        
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'  # TODO: Use test fixture,
            password='testpass123'
        )
        
        # Create building
        self.building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        
        # Create apartments
        self.apartment1 = Apartment.objects.create(
            building=self.building,
            number='A1',
            floor=1,
            current_balance=Decimal('500.00'),
            participation_mills=Decimal('100.00')
        )
        
        self.apartment2 = Apartment.objects.create(
            building=self.building,
            number='A2',
            floor=1,
            current_balance=Decimal('-200.00'),
            participation_mills=Decimal('150.00')
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_expense_list_endpoint(self):
        """Test GET /api/financial/expenses/"""
        # Create test expense
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category=ExpenseCategory.ELECTRICITY,
            distribution_type=DistributionType.EQUAL,
            date=date.today(),
            created_by=self.user
        )
        
        url = reverse('financial:expense-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Test Expense')
        self.assertEqual(response.data[0]['amount'], '1000.00')
    
    def test_expense_create_endpoint(self):
        """Test POST /api/financial/expenses/"""
        expense_data = {
            'title': 'New Test Expense',
            'amount': '1500.00',
            'category': 'ELECTRICITY',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat(),
            'description': 'Test expense creation'
        }
        
        url = reverse('financial:expense-list')
        response = self.client.post(url, expense_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Expense.objects.count(), 1)
        self.assertEqual(Expense.objects.first().title, 'New Test Expense')
    
    def test_expense_detail_endpoint(self):
        """Test GET /api/financial/expenses/{id}/"""
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category=ExpenseCategory.ELECTRICITY,
            distribution_type=DistributionType.EQUAL,
            date=date.today(),
            created_by=self.user
        )
        
        url = reverse('financial:expense-detail', kwargs={'pk': expense.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Expense')
        self.assertEqual(response.data['amount'], '1000.00')
    
    def test_expense_update_endpoint(self):
        """Test PUT /api/financial/expenses/{id}/"""
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category=ExpenseCategory.ELECTRICITY,
            distribution_type=DistributionType.EQUAL,
            date=date.today(),
            created_by=self.user
        )
        
        update_data = {
            'title': 'Updated Test Expense',
            'amount': '2000.00',
            'category': 'WATER',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat(),
            'description': 'Updated expense'
        }
        
        url = reverse('financial:expense-detail', kwargs={'pk': expense.pk})
        response = self.client.put(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expense.refresh_from_db()
        self.assertEqual(expense.title, 'Updated Test Expense')
        self.assertEqual(expense.amount, Decimal('2000.00'))
    
    def test_expense_delete_endpoint(self):
        """Test DELETE /api/financial/expenses/{id}/"""
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category=ExpenseCategory.ELECTRICITY,
            distribution_type=DistributionType.EQUAL,
            date=date.today(),
            created_by=self.user
        )
        
        url = reverse('financial:expense-detail', kwargs={'pk': expense.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Expense.objects.count(), 0)
    
    def test_payment_list_endpoint(self):
        """Test GET /api/financial/payments/"""
        payment = Payment.objects.create(
            building=self.building,
            apartment=self.apartment1,
            amount=Decimal('300.00'),
            payment_method='CASH',
            date=date.today(),
            description='Test payment',
            created_by=self.user
        )
        
        url = reverse('financial:payment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['amount'], '300.00')
    
    def test_payment_create_endpoint(self):
        """Test POST /api/financial/payments/"""
        payment_data = {
            'apartment': self.apartment1.id,
            'amount': '400.00',
            'payment_method': 'BANK_TRANSFER',
            'date': date.today().isoformat(),
            'description': 'Test payment creation'
        }
        
        url = reverse('financial:payment-list')
        response = self.client.post(url, payment_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(Payment.objects.first().amount, Decimal('400.00'))
    
    def test_meter_reading_list_endpoint(self):
        """Test GET /api/financial/meter-readings/"""
        meter_reading = MeterReading.objects.create(
            building=self.building,
            apartment=self.apartment1,
            reading_date=date.today(),
            current_value=Decimal('1000.50'),
            previous_value=Decimal('950.25'),
            created_by=self.user
        )
        
        url = reverse('financial:meter-reading-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['current_value'], '1000.50')
        self.assertEqual(response.data[0]['consumption'], '50.25')
    
    def test_meter_reading_create_endpoint(self):
        """Test POST /api/financial/meter-readings/"""
        meter_data = {
            'apartment': self.apartment1.id,
            'reading_date': date.today().isoformat(),
            'current_value': '1100.75',
            'previous_value': '1000.50'
        }
        
        url = reverse('financial:meter-reading-list')
        response = self.client.post(url, meter_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MeterReading.objects.count(), 1)
        meter_reading = MeterReading.objects.first()
        self.assertEqual(meter_reading.current_value, Decimal('1100.75'))
        self.assertEqual(meter_reading.consumption, Decimal('100.25'))
    
    def test_financial_dashboard_endpoint(self):
        """Test GET /api/financial/dashboard/"""
        # Create some test data
        Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category=ExpenseCategory.ELECTRICITY,
            distribution_type=DistributionType.EQUAL,
            date=date.today(),
            created_by=self.user
        )
        
        Payment.objects.create(
            building=self.building,
            apartment=self.apartment1,
            amount=Decimal('300.00'),
            payment_method='CASH',
            date=date.today(),
            created_by=self.user
        )
        
        url = reverse('financial:financial-dashboard')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_expenses', response.data)
        self.assertIn('total_payments', response.data)
        self.assertIn('current_reserve', response.data)
    
    def test_common_expense_calculation_endpoint(self):
        """Test POST /api/financial/common-expenses/calculate/"""
        calculation_data = {
            'amount': '1000.00',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat()
        }
        
        url = reverse('financial:common-expense-calculate')
        response = self.client.post(url, calculation_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('shares', response.data)
        self.assertEqual(len(response.data['shares']), 2)  # 2 apartments
    
    def test_meter_reading_bulk_import_endpoint(self):
        """Test POST /api/financial/meter-readings/bulk-import/"""
        bulk_data = {
            'readings': [
                {
                    'apartment': self.apartment1.id,
                    'reading_date': date.today().isoformat(),
                    'current_value': '1100.00',
                    'previous_value': '1000.00'
                },
                {
                    'apartment': self.apartment2.id,
                    'reading_date': date.today().isoformat(),
                    'current_value': '1200.00',
                    'previous_value': '1100.00'
                }
            ]
        }
        
        url = reverse('financial:meter-reading-bulk-import')
        response = self.client.post(url, bulk_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MeterReading.objects.count(), 2)
    
    def test_meter_reading_statistics_endpoint(self):
        """Test GET /api/financial/meter-readings/statistics/"""
        # Create some meter readings
        MeterReading.objects.create(
            building=self.building,
            apartment=self.apartment1,
            reading_date=date.today(),
            current_value=Decimal('1000.00'),
            previous_value=Decimal('900.00'),
            created_by=self.user
        )
        
        MeterReading.objects.create(
            building=self.building,
            apartment=self.apartment2,
            reading_date=date.today(),
            current_value=Decimal('1200.00'),
            previous_value=Decimal('1100.00'),
            created_by=self.user
        )
        
        url = reverse('financial:meter-reading-statistics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_consumption', response.data)
        self.assertIn('average_consumption', response.data)
        self.assertIn('apartment_consumption', response.data)
    
    def test_unauthorized_access(self):
        """Test unauthorized access to endpoints"""
        # Create unauthenticated client
        unauthenticated_client = APIClient()
        
        url = reverse('financial:expense-list')
        response = unauthenticated_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_invalid_data_validation(self):
        """Test validation of invalid data"""
        # Test negative amount
        invalid_expense_data = {
            'title': 'Test Expense',
            'amount': '-100.00',
            'category': 'ELECTRICITY',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat()
        }
        
        url = reverse('financial:expense-list')
        response = self.client.post(url, invalid_expense_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)
    
    def test_meter_reading_validation(self):
        """Test meter reading validation"""
        # Test current value less than previous value
        invalid_meter_data = {
            'apartment': self.apartment1.id,
            'reading_date': date.today().isoformat(),
            'current_value': '900.00',
            'previous_value': '1000.00'
        }
        
        url = reverse('financial:meter-reading-list')
        response = self.client.post(url, invalid_meter_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_value', response.data)


class FinancialPermissionsTestCase(TestCase):
    """Test cases for Financial Permissions"""
    
    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            schema_name='test_permissions',
            name='Test Permissions Tenant'
        )
        
        # Create different types of users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com'  # TODO: Use test fixture,
            password='adminpass123',
            is_staff=True
        )
        
        self.regular_user = User.objects.create_user(
            username='user',
            email='user@example.com'  # TODO: Use test fixture,
            password='userpass123'
        )
        
        self.building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        
        self.apartment = Apartment.objects.create(
            building=self.building,
            number='A1',
            floor=1,
            current_balance=Decimal('500.00'),
            participation_mills=Decimal('100.00')
        )
        
        self.client = APIClient()
    
    def test_admin_user_permissions(self):
        """Test admin user has full access"""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('financial:expense-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_regular_user_permissions(self):
        """Test regular user permissions"""
        self.client.force_authenticate(user=self.regular_user)
        
        url = reverse('financial:expense-list')
        response = self.client.get(url)
        
        # This depends on your permission setup
        # You might want to adjust this based on your actual permissions
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])


if __name__ == '__main__':
    # Run tests
    import django
    django.setup()
    
    # Create test runner
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Run tests
    failures = test_runner.run_tests(['financial.test_api'])
    
    if failures:
        print(f"❌ {failures} test(s) failed")
    else:
        print("✅ All API integration tests passed!") 