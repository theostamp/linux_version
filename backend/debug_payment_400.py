#!/usr/bin/env python3
"""
Debug script to test payment API and identify 400 error cause
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment
from apartments.models import Apartment
from financial.serializers import PaymentSerializer
from rest_framework.test import APIRequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()

def debug_payment_validation():
    """Debug payment validation issues"""
    print("🔍 Debugging Payment Validation Issues...")
    print("=" * 60)
    
    with schema_context('demo'):
        try:
            # Get test data
            apartment = Apartment.objects.first()
            if not apartment:
                print("❌ No apartments found in demo tenant")
                return False
                
            print(f"✅ Using apartment: {apartment.number} (ID: {apartment.id})")
            
            # Test data that frontend would send
            test_data = {
                'apartment': apartment.id,
                'amount': 100.50,
                'reserve_fund_amount': 0,
                'date': '2025-08-11',
                'method': 'cash',
                'payment_type': 'common_expense',
                'payer_type': 'owner',
                'payer_name': '',
                'reference_number': '',
                'notes': 'Test payment'
            }
            
            print(f"📋 Test data: {test_data}")
            
            # Test serializer validation
            factory = APIRequestFactory()
            request = factory.post('/api/financial/payments/')
            
            # Create a test user for context
            user = User.objects.first()
            if user:
                request.user = user
            
            serializer = PaymentSerializer(data=test_data, context={'request': request})
            
            if serializer.is_valid():
                print("✅ Serializer validation passed")
                payment = serializer.save()
                print(f"✅ Payment created with ID: {payment.id}")
                payment.delete()  # Clean up
            else:
                print("❌ Serializer validation failed:")
                print(f"   Errors: {serializer.errors}")
                
                # Check each field individually
                for field, errors in serializer.errors.items():
                    print(f"   Field '{field}': {errors}")
                    
                # Test with minimal data
                print("\n🔍 Testing with minimal data...")
                minimal_data = {
                    'apartment': apartment.id,
                    'amount': 100.50,
                    'date': '2025-08-11',
                    'method': 'cash'
                }
                
                minimal_serializer = PaymentSerializer(data=minimal_data, context={'request': request})
                if minimal_serializer.is_valid():
                    print("✅ Minimal data validation passed")
                else:
                    print("❌ Minimal data validation failed:")
                    print(f"   Errors: {minimal_serializer.errors}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during debugging: {e}")
            import traceback
            traceback.print_exc()
            return False

def check_payment_model_fields():
    """Check Payment model field definitions"""
    print("\n🔍 Checking Payment Model Fields...")
    print("=" * 60)
    
    # Get field info
    fields = Payment._meta.get_fields()
    
    for field in fields:
        if hasattr(field, 'name'):
            field_name = field.name
            field_type = type(field).__name__
            is_required = not field.blank if hasattr(field, 'blank') else True
            has_default = hasattr(field, 'default') and field.default is not None
            
            print(f"   {field_name}: {field_type} (required: {is_required}, default: {has_default})")
            
            # Check choices for CharField
            if hasattr(field, 'choices') and field.choices:
                print(f"     Choices: {field.choices}")

if __name__ == '__main__':
    print("🚀 Starting Payment API Debug...")
    
    check_payment_model_fields()
    debug_payment_validation()
    
    print("\n✅ Debug complete!")
