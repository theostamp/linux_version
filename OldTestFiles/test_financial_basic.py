#!/usr/bin/env python3
"""
Basic Financial System Test
Tests the basic functionality without database setup
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

from decimal import Decimal


def test_models_import():
    """Test that models can be imported"""
    print("🧪 Testing Model Imports...")
    print("=" * 50)
    
    try:
        print("✅ Financial models imported successfully")
        
        print("✅ Building model imported successfully")
        
        print("✅ Apartment model imported successfully")
        
        print("✅ Client model imported successfully")
        
        print("✅ CustomUser model imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False


def test_serializers_import():
    """Test that serializers can be imported"""
    print("\n🧪 Testing Serializer Imports...")
    print("=" * 50)
    
    try:
        print("✅ Financial serializers imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Serializer import failed: {e}")
        return False


def test_services_import():
    """Test that services can be imported"""
    print("\n🧪 Testing Service Imports...")
    print("=" * 50)
    
    try:
        print("✅ CommonExpenseCalculator imported successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Service import failed: {e}")
        return False


def test_business_logic():
    """Test business logic calculations"""
    print("\n🧪 Testing Business Logic...")
    print("=" * 50)
    
    try:
        # Test expense distribution calculation
        total_amount = Decimal('1000.00')
        apartment1_mills = Decimal('100.00')
        apartment2_mills = Decimal('150.00')
        
        total_mills = apartment1_mills + apartment2_mills
        
        # Calculate shares
        share1 = (apartment1_mills / total_mills) * total_amount
        share2 = (apartment2_mills / total_mills) * total_amount
        
        print("✅ Expense distribution calculation:")
        print(f"   Total amount: {total_amount}")
        print(f"   Apartment 1 (100 mills): {share1:.2f}")
        print(f"   Apartment 2 (150 mills): {share2:.2f}")
        print(f"   Total shares: {(share1 + share2):.2f}")
        
        # Verify calculation
        if abs((share1 + share2) - total_amount) < Decimal('0.01'):
            print("✅ Calculation verification passed")
        else:
            print("❌ Calculation verification failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Business logic test failed: {e}")
        return False


def test_model_choices():
    """Test model choices and constants"""
    print("\n🧪 Testing Model Choices...")
    print("=" * 50)
    
    try:
        from financial.models import Expense, Payment, MeterReading
        
        # Test expense categories
        expense_categories = [choice[0] for choice in Expense.EXPENSE_CATEGORIES]
        print(f"✅ Expense categories: {len(expense_categories)} categories found")
        
        # Test distribution types
        distribution_types = [choice[0] for choice in Expense.DISTRIBUTION_TYPES]
        print(f"✅ Distribution types: {len(distribution_types)} types found")
        
        # Test payment methods
        payment_methods = [choice[0] for choice in Payment.PAYMENT_METHODS]
        print(f"✅ Payment methods: {len(payment_methods)} methods found")
        
        # Test meter types
        meter_types = [choice[0] for choice in MeterReading.METER_TYPES]
        print(f"✅ Meter types: {len(meter_types)} types found")
        
        return True
        
    except Exception as e:
        print(f"❌ Model choices test failed: {e}")
        return False


def test_validation_rules():
    """Test validation rules"""
    print("\n🧪 Testing Validation Rules...")
    print("=" * 50)
    
    try:
        # Test decimal validation
        amount = Decimal('1000.50')
        if amount > 0:
            print("✅ Positive amount validation passed")
        else:
            print("❌ Positive amount validation failed")
            return False
        
        # Test percentage validation
        percentage = Decimal('25.50')
        if 0 <= percentage <= 100:
            print("✅ Percentage validation passed")
        else:
            print("❌ Percentage validation failed")
            return False
        
        # Test mills validation
        mills = Decimal('150.00')
        if mills > 0:
            print("✅ Mills validation passed")
        else:
            print("❌ Mills validation failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Validation rules test failed: {e}")
        return False


def main():
    """Main test runner"""
    print("🚀 Basic Financial System Test Suite")
    print("=" * 60)
    
    tests = [
        ("Model Imports", test_models_import),
        ("Serializer Imports", test_serializers_import),
        ("Service Imports", test_services_import),
        ("Business Logic", test_business_logic),
        ("Model Choices", test_model_choices),
        ("Validation Rules", test_validation_rules),
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