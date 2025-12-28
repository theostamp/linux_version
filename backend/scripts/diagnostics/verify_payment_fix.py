#!/usr/bin/env python3
"""
Simple verification script for payment creation fix
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction
from apartments.models import Apartment

def verify_payment_fix():
    """Verify that payment creation works without date field errors"""
    
    with schema_context('demo'):
        try:
            # Get first apartment
            apartment = Apartment.objects.first()
            if not apartment:
                print("❌ No apartments found")
                return False
            
            print(f"🏠 Testing with apartment: {apartment.number}")
            
            # Create payment
            payment = Payment.objects.create(
                apartment=apartment,
                amount=Decimal('25.00'),
                date=date(2025, 8, 26),
                method='cash',
                payment_type='common_expense',
                payer_type='owner',
                payer_name='Test User'
            )
            
            print(f"✅ Payment created: {payment.id}")
            
            # Check if transaction was created
            transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if transaction:
                print(f"✅ Transaction created: {transaction.id}")
                print(f"   Date: {transaction.date}")
                print(f"   Type: {type(transaction.date)}")
                return True
            else:
                print("❌ No transaction found")
                return False
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

if __name__ == "__main__":
    print("🧪 Verifying payment creation fix...")
    success = verify_payment_fix()
    
    if success:
        print("\n✅ Payment creation fix is working!")
    else:
        print("\n❌ Payment creation still has issues.")
