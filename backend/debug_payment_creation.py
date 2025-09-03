import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment
from apartments.models import Apartment
from financial.serializers import PaymentSerializer
from rest_framework.test import APIRequestFactory

def debug_payment_creation():
    """Debug payment creation to identify 400 Bad Request issue"""
    
    with schema_context('demo'):
        print("🔍 Debugging Payment Creation Issue")
        print("=" * 50)
        
        # Get a test apartment
        apartment = Apartment.objects.first()
        if not apartment:
            print("❌ No apartments found in demo schema")
            return
            
        print(f"✅ Using apartment: {apartment.number} (ID: {apartment.id})")
        
        # Test data that matches frontend structure
        test_payment_data = {
            'apartment': apartment.id,  # This is the key field
            'amount': '50.00',
            'reserve_fund_amount': '10.00',
            'previous_obligations_amount': '5.00',
            'date': '2025-08-31',
            'method': 'bank_transfer',
            'payment_type': 'common_expense',
            'payer_type': 'owner',
            'payer_name': 'Test Payer',
            'reference_number': 'TEST123',
            'notes': 'Test payment for debugging'
        }
        
        print("\n📋 Test Payment Data:")
        for key, value in test_payment_data.items():
            print(f"  {key}: {value}")
        
        # Test serializer validation
        print("\n🧪 Testing PaymentSerializer validation...")
        
        factory = APIRequestFactory()
        request = factory.post('/api/financial/payments/', test_payment_data)
        
        serializer = PaymentSerializer(data=test_payment_data, context={'request': request})
        
        if serializer.is_valid():
            print("✅ Serializer validation passed")
            
            # Try to save
            try:
                payment = serializer.save()
                print(f"✅ Payment created successfully: ID {payment.id}")
                
                # Clean up test payment
                payment.delete()
                print("🧹 Test payment cleaned up")
                
            except Exception as e:
                print(f"❌ Error saving payment: {str(e)}")
                
        else:
            print("❌ Serializer validation failed:")
            for field, errors in serializer.errors.items():
                print(f"  {field}: {errors}")
        
        # Test required fields
        print("\n🔍 Testing required fields...")
        required_fields = ['apartment', 'amount', 'date', 'method']
        
        for field in required_fields:
            test_data = test_payment_data.copy()
            del test_data[field]
            
            serializer = PaymentSerializer(data=test_data)
            if not serializer.is_valid():
                if field in serializer.errors:
                    print(f"  ❌ {field}: Required field - {serializer.errors[field]}")
                else:
                    print(f"  ✅ {field}: Not causing validation error")
            else:
                print(f"  ⚠️ {field}: Unexpectedly passed validation")
        
        # Test apartment validation
        print("\n🏠 Testing apartment validation...")
        
        # Test with invalid apartment ID
        invalid_data = test_payment_data.copy()
        invalid_data['apartment'] = 99999
        
        serializer = PaymentSerializer(data=invalid_data)
        if not serializer.is_valid():
            print(f"  ❌ Invalid apartment ID validation: {serializer.errors}")
        else:
            print("  ⚠️ Invalid apartment ID unexpectedly passed validation")
        
        # Test with string apartment ID (as sent from frontend)
        string_data = test_payment_data.copy()
        string_data['apartment'] = str(apartment.id)
        
        serializer = PaymentSerializer(data=string_data)
        if serializer.is_valid():
            print("  ✅ String apartment ID validation passed")
        else:
            print(f"  ❌ String apartment ID validation failed: {serializer.errors}")
        
        print("\n🔍 Checking Payment model constraints...")
        
        # Check model field definitions
        payment_fields = Payment._meta.get_fields()
        for field in payment_fields:
            if hasattr(field, 'null') and hasattr(field, 'blank'):
                required = not (field.null or field.blank)
                if required and field.name not in ['id', 'created_at', 'updated_at']:
                    print(f"  📋 {field.name}: Required field")
        
        print("\n✅ Debug analysis complete")

if __name__ == "__main__":
    debug_payment_creation()
