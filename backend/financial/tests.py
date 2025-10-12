from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import json

from .models import (
    Expense, Transaction, Payment, ExpenseApartment, 
    MeterReading
)
from .serializers import (
    ExpenseSerializer, TransactionSerializer, PaymentSerializer,
    ExpenseApartmentSerializer, MeterReadingSerializer,
    FinancialSummarySerializer, ApartmentBalanceSerializer
)
from .services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from django_tenants.test.cases import TenantTestCase
from tenants.models import Client as Tenant

User = get_user_model()


class FinancialModelsTestCase(TestCase):
    """Test cases for Financial Models"""
    
    def setUp(self):
        """Set up test data"""
        # Create tenant
        self.tenant = Tenant.objects.create(
            schema_name='test_financial',
            name='Test Financial Tenant'
        )
        
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
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
    
    def test_expense_creation(self):
        """Test expense creation with all required fields"""
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category='electricity_common',
            distribution_type='equal_share',
            date=date.today(),
            notes='Test expense description'
        )
        
        self.assertEqual(expense.title, 'Test Expense')
        self.assertEqual(expense.amount, Decimal('1000.00'))
        self.assertEqual(expense.category, 'electricity_common')
        self.assertEqual(expense.distribution_type, 'equal_share')
        self.assertEqual(expense.building, self.building)
    
    def test_transaction_creation(self):
        """Test transaction creation"""
        transaction = Transaction.objects.create(
            building=self.building,
            transaction_type='EXPENSE',
            amount=Decimal('500.00'),
            description='Test transaction',
            date=date.today(),
            created_by=self.user
        )
        
        self.assertEqual(transaction.transaction_type, 'EXPENSE')
        self.assertEqual(transaction.amount, Decimal('500.00'))
        self.assertEqual(transaction.building, self.building)
    
    def test_payment_creation(self):
        """Test payment creation"""
        payment = Payment.objects.create(
            building=self.building,
            apartment=self.apartment1,
            amount=Decimal('300.00'),
            payment_method='CASH',
            date=date.today(),
            description='Test payment',
            created_by=self.user
        )
        
        self.assertEqual(payment.amount, Decimal('300.00'))
        self.assertEqual(payment.apartment, self.apartment1)
        self.assertEqual(payment.payment_method, 'CASH')
    
    def test_meter_reading_creation(self):
        """Test meter reading creation"""
        meter_reading = MeterReading.objects.create(
            building=self.building,
            apartment=self.apartment1,
            reading_date=date.today(),
            current_value=Decimal('1000.50'),
            previous_value=Decimal('950.25'),
            created_by=self.user
        )
        
        self.assertEqual(meter_reading.current_value, Decimal('1000.50'))
        self.assertEqual(meter_reading.previous_value, Decimal('950.25'))
        self.assertEqual(meter_reading.consumption, Decimal('50.25'))
        self.assertEqual(meter_reading.apartment, self.apartment1)
    
    def test_expense_apartment_creation(self):
        """Test expense apartment relationship"""
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category='electricity_common',
            distribution_type='equal_share',
            date=date.today()
        )
        
        expense_apartment = ExpenseApartment.objects.create(
            expense=expense,
            apartment=self.apartment1,
            share_amount=Decimal('500.00'),
            share_percentage=Decimal('50.00')
        )
        
        self.assertEqual(expense_apartment.expense, expense)
        self.assertEqual(expense_apartment.apartment, self.apartment1)
        self.assertEqual(expense_apartment.share_amount, Decimal('500.00'))


class FinancialSerializersTestCase(TestCase):
    """Test cases for Financial Serializers"""
    
    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            schema_name='test_serializers',
            name='Test Serializers Tenant'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
    
    def test_expense_serializer(self):
        """Test expense serializer"""
        expense_data = {
            'title': 'Test Expense',
            'amount': '1000.00',
            'category': 'ELECTRICITY',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat(),
            'description': 'Test expense description'
        }
        
        serializer = ExpenseSerializer(data=expense_data)
        self.assertTrue(serializer.is_valid())
        
        expense = serializer.save(
            building=self.building,
            created_by=self.user
        )
        
        self.assertEqual(expense.title, 'Test Expense')
        self.assertEqual(expense.amount, Decimal('1000.00'))
    
    def test_payment_serializer(self):
        """Test payment serializer"""
        payment_data = {
            'apartment': self.apartment.id,
            'amount': '300.00',
            'payment_method': 'CASH',
            'date': date.today().isoformat(),
            'description': 'Test payment'
        }
        
        serializer = PaymentSerializer(data=payment_data)
        self.assertTrue(serializer.is_valid())
        
        payment = serializer.save(
            building=self.building,
            created_by=self.user
        )
        
        self.assertEqual(payment.amount, Decimal('300.00'))
        self.assertEqual(payment.apartment, self.apartment)
    
    def test_meter_reading_serializer(self):
        """Test meter reading serializer"""
        meter_data = {
            'apartment': self.apartment.id,
            'reading_date': date.today().isoformat(),
            'current_value': '1000.50',
            'previous_value': '950.25'
        }
        
        serializer = MeterReadingSerializer(data=meter_data)
        self.assertTrue(serializer.is_valid())
        
        meter_reading = serializer.save(
            building=self.building,
            created_by=self.user
        )
        
        self.assertEqual(meter_reading.current_value, Decimal('1000.50'))
        self.assertEqual(meter_reading.consumption, Decimal('50.25'))


class CommonExpenseCalculatorTestCase(TestCase):
    """Test cases for Common Expense Calculator Service"""
    
    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            schema_name='test_calculator',
            name='Test Calculator Tenant'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        
        # Create apartments with different participation mills
        self.apartment1 = Apartment.objects.create(
            building=self.building,
            number='A1',
            floor=1,
            participation_mills=Decimal('100.00')
        )
        
        self.apartment2 = Apartment.objects.create(
            building=self.building,
            number='A2',
            floor=1,
            participation_mills=Decimal('150.00')
        )
        
        self.apartment3 = Apartment.objects.create(
            building=self.building,
            number='A3',
            floor=2,
            participation_mills=Decimal('200.00')
        )
        
        self.calculator = CommonExpenseCalculator(self.building)
    
    def test_calculate_by_mills(self):
        """Test calculation by participation mills"""
        total_amount = Decimal('1000.00')
        shares = self.calculator.calculate_by_mills(total_amount)
        
        # Total mills: 100 + 150 + 200 = 450
        # Expected shares:
        # A1: 1000 * (100/450) = 222.22
        # A2: 1000 * (150/450) = 333.33
        # A3: 1000 * (200/450) = 444.44
        
        self.assertEqual(len(shares), 3)
        
        # Check that shares sum up to total amount
        total_shares = sum(share['amount'] for share in shares)
        self.assertAlmostEqual(total_shares, total_amount, places=2)
    
    def test_calculate_equal_shares(self):
        """Test calculation of equal shares"""
        total_amount = Decimal('900.00')
        shares = self.calculator.calculate_equal_shares(total_amount)
        
        # Expected: 900 / 3 = 300 each
        self.assertEqual(len(shares), 3)
        
        for share in shares:
            self.assertEqual(share['amount'], Decimal('300.00'))
    
    def test_calculate_by_meters(self):
        """Test calculation by meter readings"""
        # Create meter readings
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
            current_value=Decimal('1500.00'),
            previous_value=Decimal('1300.00'),
            created_by=self.user
        )
        
        MeterReading.objects.create(
            building=self.building,
            apartment=self.apartment3,
            reading_date=date.today(),
            current_value=Decimal('2000.00'),
            previous_value=Decimal('1800.00'),
            created_by=self.user
        )
        
        total_amount = Decimal('1000.00')
        shares = self.calculator.calculate_by_meters(total_amount, date.today())
        
        # Total consumption: 100 + 200 + 200 = 500
        # Expected shares:
        # A1: 1000 * (100/500) = 200.00
        # A2: 1000 * (200/500) = 400.00
        # A3: 1000 * (200/500) = 400.00
        
        self.assertEqual(len(shares), 3)
        
        total_shares = sum(share['amount'] for share in shares)
        self.assertAlmostEqual(total_shares, total_amount, places=2)


class FinancialAPITestCase(TestCase):
    """Test cases for Financial API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            schema_name='test_api',
            name='Test API Tenant'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
    
    def test_expense_list_endpoint(self):
        """Test expense list endpoint"""
        # Create test expense
        expense = Expense.objects.create(
            building=self.building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category='electricity_common',
            distribution_type='equal_share',
            date=date.today(),
            created_by=self.user
        )
        
        # This would be tested with Django REST framework test client
        # For now, we'll test the model creation
        self.assertEqual(Expense.objects.count(), 1)
        self.assertEqual(Expense.objects.first(), expense)
    
    def test_payment_creation_endpoint(self):
        """Test payment creation endpoint"""
        payment_data = {
            'apartment': self.apartment.id,
            'amount': '300.00',
            'payment_method': 'CASH',
            'date': date.today().isoformat(),
            'description': 'Test payment'
        }
        
        # This would be tested with Django REST framework test client
        # For now, we'll test the serializer
        serializer = PaymentSerializer(data=payment_data)
        self.assertTrue(serializer.is_valid())


class FinancialValidationTestCase(TestCase):
    """Test cases for Financial Validation"""
    
    def setUp(self):
        """Set up test data"""
        self.tenant = Tenant.objects.create(
            schema_name='test_validation',
            name='Test Validation Tenant'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
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
    
    def test_expense_amount_validation(self):
        """Test expense amount validation"""
        # Test negative amount
        expense_data = {
            'title': 'Test Expense',
            'amount': '-100.00',
            'category': 'ELECTRICITY',
            'distribution_type': 'EQUAL',
            'date': date.today().isoformat()
        }
        
        serializer = ExpenseSerializer(data=expense_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)
    
    def test_meter_reading_validation(self):
        """Test meter reading validation"""
        # Test current value less than previous value
        meter_data = {
            'apartment': self.apartment.id,
            'reading_date': date.today().isoformat(),
            'current_value': '900.00',
            'previous_value': '1000.00'
        }
        
        serializer = MeterReadingSerializer(data=meter_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('current_value', serializer.errors)
    
    def test_payment_amount_validation(self):
        """Test payment amount validation"""
        # Test zero amount
        payment_data = {
            'apartment': self.apartment.id,
            'amount': '0.00',
            'payment_method': 'CASH',
            'date': date.today().isoformat()
        }
        
        serializer = PaymentSerializer(data=payment_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)


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
    failures = test_runner.run_tests(['financial'])
    
    if failures:
        print(f"❌ {failures} test(s) failed")
    else:
        print("✅ All tests passed!")
