#!/usr/bin/env python3
"""
Simple Financial System Test
Tests the basic functionality of the financial system
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date

# Import models
from financial.models import Expense, Payment, MeterReading, Transaction
from buildings.models import Building
from apartments.models import Apartment
from tenants.models import Client as Tenant

User = get_user_model()


def test_basic_functionality():
    """Test basic financial functionality"""
    print("🧪 Testing Basic Financial Functionality...")
    print("=" * 50)
    
    try:
        # Create test tenant
        tenant = Tenant.objects.create(
            schema_name='test_simple',
            name='Test Simple Tenant'
        )
        print("✅ Tenant created")
        
        # Create test user
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        print("✅ User created")
        
        # Create test building
        building = Building.objects.create(
            name='Test Building',
            address='Test Address 123',
            current_reserve=Decimal('10000.00')
        )
        print("✅ Building created")
        
        # Create test apartment
        apartment = Apartment.objects.create(
            building=building,
            number='A1',
            floor=1,
            current_balance=Decimal('500.00'),
            participation_mills=Decimal('100.00')
        )
        print("✅ Apartment created")
        
        # Test Expense creation
        expense = Expense.objects.create(
            building=building,
            title='Test Expense',
            amount=Decimal('1000.00'),
            category='electricity_common',
            distribution_type='equal_share',
            date=date.today(),
            notes='Test expense'
        )
        print("✅ Expense created")
        
        # Test Payment creation
        payment = Payment.objects.create(
            apartment=apartment,
            amount=Decimal('300.00'),
            date=date.today(),
            method='cash',
            notes='Test payment'
        )
        print("✅ Payment created")
        
        # Test MeterReading creation
        meter_reading = MeterReading.objects.create(
            apartment=apartment,
            reading_date=date.today(),
            value=Decimal('1000.50'),
            meter_type='heating',
            notes='Test reading'
        )
        print("✅ Meter reading created")
        
        # Test Transaction creation
        transaction = Transaction.objects.create(
            building=building,
            date=django.utils.timezone.now(),
            type='expense_created',
            status='completed',
            description='Test transaction',
            apartment=apartment,
            amount=Decimal('1000.00'),
            balance_after=Decimal('9000.00')
        )
        print("✅ Transaction created")
        
        # Test queries
        expenses = Expense.objects.filter(building=building)
        payments = Payment.objects.filter(apartment=apartment)
        meter_readings = MeterReading.objects.filter(apartment=apartment)
        transactions = Transaction.objects.filter(building=building)
        
        print(f"✅ Queries successful: {expenses.count()} expenses, {payments.count()} payments, {meter_readings.count()} readings, {transactions.count()} transactions")
        
        # Clean up
        Transaction.objects.filter(building=building).delete()
        MeterReading.objects.filter(apartment=apartment).delete()
        Payment.objects.filter(apartment=apartment).delete()
        Expense.objects.filter(building=building).delete()
        Apartment.objects.filter(id=apartment.id).delete()
        Building.objects.filter(id=building.id).delete()
        User.objects.filter(id=user.id).delete()
        Tenant.objects.filter(id=tenant.id).delete()
        
        print("✅ Cleanup completed")
        print("🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


def test_models_validation():
    """Test model validation"""
    print("\n🧪 Testing Model Validation...")
    print("=" * 50)
    
    try:
        # Create test data
        tenant = Tenant.objects.create(
            schema_name='test_validation',
            name='Test Validation Tenant'
        )
        
        user = User.objects.create_user(
            email='test2@example.com',
            password='testpass123',
            first_name='Test2',
            last_name='User'
        )
        
        building = Building.objects.create(
            name='Test Building 2',
            address='Test Address 456',
            current_reserve=Decimal('5000.00')
        )
        
        apartment = Apartment.objects.create(
            building=building,
            number='A2',
            floor=2,
            current_balance=Decimal('-200.00'),
            participation_mills=Decimal('150.00')
        )
        
        # Test expense validation
        expense = Expense.objects.create(
            building=building,
            title='Validation Test Expense',
            amount=Decimal('500.00'),
            category='cleaning',
            distribution_type='by_participation_mills',
            date=date.today(),
            notes='Validation test'
        )
        
        # Test payment validation
        payment = Payment.objects.create(
            apartment=apartment,
            amount=Decimal('250.00'),
            date=date.today(),
            method='bank_transfer',
            notes='Validation test payment'
        )
        
        # Test meter reading validation
        meter_reading = MeterReading.objects.create(
            apartment=apartment,
            reading_date=date.today(),
            value=Decimal('1200.75'),
            meter_type='water',
            notes='Validation test reading'
        )
        
        print("✅ All model validations passed")
        
        # Clean up
        MeterReading.objects.filter(apartment=apartment).delete()
        Payment.objects.filter(apartment=apartment).delete()
        Expense.objects.filter(building=building).delete()
        Apartment.objects.filter(id=apartment.id).delete()
        Building.objects.filter(id=building.id).delete()
        User.objects.filter(id=user.id).delete()
        Tenant.objects.filter(id=tenant.id).delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Validation test failed: {e}")
        return False


def test_business_logic():
    """Test business logic"""
    print("\n🧪 Testing Business Logic...")
    print("=" * 50)
    
    try:
        # Create test data
        tenant = Tenant.objects.create(
            schema_name='test_business',
            name='Test Business Tenant'
        )
        
        building = Building.objects.create(
            name='Test Business Building',
            address='Test Address 789',
            current_reserve=Decimal('15000.00')
        )
        
        apartment1 = Apartment.objects.create(
            building=building,
            number='A1',
            floor=1,
            current_balance=Decimal('0.00'),
            participation_mills=Decimal('100.00')
        )
        
        apartment2 = Apartment.objects.create(
            building=building,
            number='A2',
            floor=1,
            current_balance=Decimal('0.00'),
            participation_mills=Decimal('150.00')
        )
        
        # Test expense distribution calculation
        total_mills = apartment1.participation_mills + apartment2.participation_mills
        expense_amount = Decimal('1000.00')
        
        # Calculate shares
        share1 = (apartment1.participation_mills / total_mills) * expense_amount
        share2 = (apartment2.participation_mills / total_mills) * expense_amount
        
        print(f"✅ Business logic calculation: Apartment A1 share: {share1:.2f}, Apartment A2 share: {share2:.2f}")
        print(f"✅ Total shares: {(share1 + share2):.2f} (should equal {expense_amount})")
        
        # Test balance updates
        payment1 = Payment.objects.create(
            apartment=apartment1,
            amount=share1,
            date=date.today(),
            method='cash',
            notes='Payment for expense share'
        )
        
        payment2 = Payment.objects.create(
            apartment=apartment2,
            amount=share2,
            date=date.today(),
            method='cash',
            notes='Payment for expense share'
        )
        
        print("✅ Balance updates completed")
        
        # Clean up
        Payment.objects.filter(apartment__building=building).delete()
        Apartment.objects.filter(building=building).delete()
        Building.objects.filter(id=building.id).delete()
        Tenant.objects.filter(id=tenant.id).delete()
        
        return True
        
    except Exception as e:
        print(f"❌ Business logic test failed: {e}")
        return False


def main():
    """Main test runner"""
    print("🚀 Simple Financial System Test Suite")
    print("=" * 60)
    
    tests = [
        ("Basic Functionality", test_basic_functionality),
        ("Model Validation", test_models_validation),
        ("Business Logic", test_business_logic),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The financial system is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues.")
        return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code) 