#!/usr/bin/env python3
"""
Test script to simulate PaymentViewSet.perform_create
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction
from apartments.models import Apartment

def test_perform_create_simulation():
    """Simulate the perform_create method of PaymentViewSet"""
    
    with schema_context('demo'):
        try:
            # Get first apartment
            apartment = Apartment.objects.first()
            if not apartment:
                print("❌ No apartments found")
                return False
            
            building = apartment.building
            print(f"🏠 Testing with apartment: {apartment.number}")
            
            # Simulate payment creation (like serializer.save())
            payment = Payment.objects.create(
                apartment=apartment,
                amount=Decimal('35.00'),
                date=date(2025, 8, 26),
                method='cash',
                payment_type='common_expense',
                payer_type='owner',
                payer_name='Test Perform Create User',
                notes='Test payment simulation'
            )
            
            print(f"✅ Payment created: {payment.id}")
            
            # Simulate the perform_create logic
            # Set reserve_fund_amount if provided
            reserve_fund_amount = 0
            if reserve_fund_amount:
                payment.reserve_fund_amount = reserve_fund_amount
                payment.save()
            
            # Ενημέρωση του τρέχοντος αποθεματικού του κτιρίου
            building.current_reserve += payment.amount
            building.save()
            print(f"✅ Building reserve updated: {building.current_reserve}€")
            
            # Ενημέρωση του υπολοίπου του διαμερίσματος
            previous_balance = apartment.current_balance or 0
            apartment.current_balance = previous_balance + payment.amount
            apartment.save()
            print(f"✅ Apartment balance updated: {apartment.current_balance}€")
            
            # Δημιουργία αντίστοιχου Transaction record
            # Προσθήκη πληροφοριών αποθεματικού στις σημειώσεις αν υπάρχει
            description = f"Είσπραξη κοινοχρήστων από {apartment.number} - {payment.get_method_display()}"
            if payment.reserve_fund_amount and float(payment.reserve_fund_amount) > 0:
                description += f" (Αποθεματικό: {payment.reserve_fund_amount}€)"
            
            # Convert payment.date (DateField) to DateTimeField for Transaction
            from django.utils import timezone
            
            payment_datetime = datetime.combine(payment.date, datetime.min.time())
            if timezone.is_naive(payment_datetime):
                payment_datetime = timezone.make_aware(payment_datetime)
            
            print(f"📅 Payment date: {payment.date} (type: {type(payment.date)})")
            print(f"📅 Payment datetime: {payment_datetime} (type: {type(payment_datetime)})")
            
            transaction = Transaction.objects.create(
                building=building,
                apartment=apartment,
                date=payment_datetime,  # Use converted datetime
                apartment_number=apartment.number,
                type='common_expense_payment',
                description=description,
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
    print("🧪 Testing perform_create simulation...")
    success = test_perform_create_simulation()
    
    if success:
        print("\n✅ Payment creation simulation works!")
    else:
        print("\n❌ Payment creation simulation failed!")
