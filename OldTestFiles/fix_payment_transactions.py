#!/usr/bin/env python3
"""
Script για δημιουργία Transaction records για τα υπάρχοντα Payment records
"""

import os
import sys
import django
from decimal import Decimal

"""
Script can run both on host and inside the Docker container.
- If running on host (project mounted at /home/theo/projects/linux_version), ensure backend path exists
- If running in container (/app), adapt accordingly
"""

# Setup Django
PROJECT_BACKEND_PATHS = [
    '/home/theo/projects/linux_version/backend',  # host path
    '/app/backend',                               # common container path
    '/app',                                       # fallback container path when Django project at /app
]

for candidate in PROJECT_BACKEND_PATHS:
    if os.path.isdir(candidate):
        sys.path.append(candidate)
        break

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building

def fix_payment_transactions():
    """Δημιουργία Transaction records για υπάρχοντα Payment records"""
    
    try:
        client = Client.objects.get(schema_name='demo')
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε client 'demo'")
        return
    
    with tenant_context(client):
        print("🔄 ΔΙΟΡΘΩΣΗ PAYMENT TRANSACTIONS")
        print("="*50)
        
        # Βρίσκω όλα τα payments που δεν έχουν αντίστοιχο transaction
        payments_without_transactions = []
        all_payments = Payment.objects.all().order_by('date', 'id')
        
        print(f"📊 Σύνολο payments: {all_payments.count()}")
        
        for payment in all_payments:
            # Έλεγχος αν υπάρχει ήδη transaction για αυτό το payment
            existing_transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).exists()
            
            if not existing_transaction:
                payments_without_transactions.append(payment)
        
        print(f"⚠️  Payments χωρίς transactions: {len(payments_without_transactions)}")
        
        if not payments_without_transactions:
            print("✅ Όλα τα payments έχουν ήδη αντίστοιχα transactions")
            return
        
        # Επαναφορά όλων των apartment balances σε 0 για να ξαναυπολογίσω
        print("\n🔄 Επαναφορά apartment balances...")
        Apartment.objects.update(current_balance=Decimal('0.00'))
        
        # Ομαδοποίηση payments ανά διαμέρισμα για σωστό υπολογισμό υπολοίπων
        apartments_payments = {}
        for payment in payments_without_transactions:
            apartment_id = payment.apartment.id
            if apartment_id not in apartments_payments:
                apartments_payments[apartment_id] = []
            apartments_payments[apartment_id].append(payment)
        
        print(f"\n🏠 Διαμερίσματα προς επεξεργασία: {len(apartments_payments)}")
        
        total_created = 0
        
        for apartment_id, apartment_payments in apartments_payments.items():
            apartment = Apartment.objects.get(id=apartment_id)
            building = apartment.building
            
            print(f"\n🏠 Επεξεργασία διαμερίσματος {apartment.number}:")
            
            # Ταξινόμηση payments χρονολογικά
            apartment_payments.sort(key=lambda p: (p.date, p.id))
            
            running_balance = apartment.current_balance or Decimal('0.00')
            
            for payment in apartment_payments:
                previous_balance = running_balance
                running_balance += payment.amount
                
                # Δημιουργία Transaction record
                transaction = Transaction.objects.create(
                    building=building,
                    apartment=apartment,
                    apartment_number=apartment.number,
                    type='common_expense_payment',
                    description=f"Είσπραξη κοινοχρήστων από {apartment.number} - {payment.get_method_display()}",
                    amount=payment.amount,
                    balance_before=previous_balance,
                    balance_after=running_balance,
                    reference_id=str(payment.id),
                    reference_type='payment',
                    notes=payment.notes,
                    created_by='Migration Script'
                )
                
                # Ενημέρωση ημερομηνίας transaction να ταιριάζει με το payment
                from django.utils import timezone
                if payment.date:
                    # Μετατροπή date σε datetime
                    payment_datetime = timezone.make_aware(
                        timezone.datetime.combine(payment.date, timezone.datetime.min.time())
                    )
                    transaction.date = payment_datetime
                    transaction.save()
                
                print(f"  ✅ Payment {payment.id}: {payment.amount}€ → Transaction {transaction.id}")
                total_created += 1
            
            # Ενημέρωση τελικού υπολοίπου διαμερίσματος
            apartment.current_balance = running_balance
            apartment.save()
            
            print(f"  💰 Τελικό υπόλοιπο: {running_balance}€")
        
        print(f"\n✅ ΟΛΟΚΛΗΡΩΣΗ")
        print(f"📊 Δημιουργήθηκαν {total_created} νέα Transaction records")
        
        # Έλεγχος αποτελεσμάτων
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΑΠΟΤΕΛΕΣΜΑΤΩΝ:")
        total_transactions = Transaction.objects.count()
        total_payments = Payment.objects.count()
        print(f"📊 Σύνολο Transactions: {total_transactions}")
        print(f"📊 Σύνολο Payments: {total_payments}")
        
        # Έλεγχος για το κτίριο 3
        try:
            building_3 = Building.objects.get(id=3)
            building_3_transactions = Transaction.objects.filter(building=building_3).count()
            building_3_payments = Payment.objects.filter(apartment__building=building_3).count()
            
            print(f"\n🏢 ΚΤΙΡΙΟ 3 - {building_3.name}:")
            print(f"📊 Transactions: {building_3_transactions}")
            print(f"📊 Payments: {building_3_payments}")
            
            if building_3_transactions == building_3_payments:
                print("✅ Transactions και Payments ταιριάζουν!")
            else:
                print("⚠️  Εξακολουθούν να υπάρχουν αναντιστοιχίες")
                
        except Building.DoesNotExist:
            print("⚠️  Δεν βρέθηκε κτίριο με ID 3")

if __name__ == "__main__":
    fix_payment_transactions()

