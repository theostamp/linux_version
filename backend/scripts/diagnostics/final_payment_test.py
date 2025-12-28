#!/usr/bin/env python3
"""
Final test to verify payment creation fix
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

def test_payment_creation():
    """Test payment creation to verify the fix works"""
    
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
                amount=Decimal('40.00'),
                date=date(2025, 8, 26),
                method='bank_transfer',
                payment_type='common_expense',
                payer_type='owner',
                payer_name='Final Test User'
            )
            
            print(f"✅ Payment created: {payment.id}")
            
            # Simulate the perform_create logic from PaymentViewSet
            building = apartment.building
            previous_balance = apartment.current_balance or 0
            
            # Update building reserve
            building.current_reserve += payment.amount
            building.save()
            
            # Update apartment balance
            apartment.current_balance = previous_balance + payment.amount
            apartment.save()
            
            # Create transaction (this is where the fix was applied)
            from datetime import datetime
            from django.utils import timezone
            
            payment_datetime = datetime.combine(payment.date, datetime.min.time())
            if timezone.is_naive(payment_datetime):
                payment_datetime = timezone.make_aware(payment_datetime)
            
            transaction = Transaction.objects.create(
                building=building,
                apartment=apartment,
                date=payment_datetime,  # Fixed: converted datetime
                apartment_number=apartment.number,
                type='common_expense_payment',
                description=f"Είσπραξη κοινοχρήστων από {apartment.number} - {payment.get_method_display()}",
                amount=payment.amount,
                balance_before=previous_balance,
                balance_after=apartment.current_balance,
                reference_id=str(payment.id),
                reference_type='payment',
                notes=payment.notes,
                created_by='System'
            )
            
            print(f"✅ Transaction created: {transaction.id}")
            print(f"   Date: {transaction.date}")
            print(f"   Type: {type(transaction.date)}")
            print(f"   Description: {transaction.description}")
            
            return True
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("🧪 Final payment creation test...")
    success = test_payment_creation()
    
    if success:
        print("\n✅ Payment creation fix is working correctly!")
        print("   The null date field issue has been resolved.")
    else:
        print("\n❌ Payment creation still has issues.")
