#!/usr/bin/env python3
"""
Test the new payment API with payer fields
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

def test_payment_fields():
    """Test the new payment fields work correctly"""
    print("🔍 Testing Payment model with new payer fields...")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Get a test apartment
            apartment = Apartment.objects.first()
            print(f"Using apartment: {apartment.number}")
            
            # Test payment creation with new fields
            payment = Payment(
                apartment=apartment,
                amount=100.50,
                date='2025-08-11',
                method='cash',
                payment_type='common_expense',
                payer_type='owner',
                payer_name='Test Owner Name',
                notes='Test payment with payer info'
            )
            
            # Don't save to avoid affecting real data, just validate
            payment.full_clean()
            print("✅ Payment validation successful with new fields")
            
            # Test enum values
            print(f"Available payer types: {Payment.PAYER_TYPES}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    test_payment_fields()
