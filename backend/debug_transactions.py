#!/usr/bin/env python3
"""
Debug script to check transactions for apartment 10
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment
from apartments.models import Apartment

def debug_transactions():
    """Debug transactions for apartment 10"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΓΙΑ ΔΙΑΜΕΡΙΣΜΑ 10")
        print("=" * 50)
        
        # Get apartment
        apartment = Apartment.objects.get(id=10)
        print(f"🏠 Διαμέρισμα: {apartment.number} - {apartment.owner_name}")
        print()
        
        # Get all transactions
        transactions = Transaction.objects.filter(apartment=apartment).order_by('-date')
        print(f"📊 Σύνολο συναλλαγών: {transactions.count()}")
        print()
        
        print("📋 ΛΕΠΤΟΜΕΡΕΙΕΣ ΣΥΝΑΛΛΑΓΩΝ:")
        for i, transaction in enumerate(transactions, 1):
            print(f"{i}. ID: {transaction.id}")
            print(f"   Τύπος: {transaction.type} ({transaction.get_type_display()})")
            print(f"   Ποσό: {transaction.amount}€")
            print(f"   Περιγραφή: {transaction.description}")
            print(f"   Ημερομηνία: {transaction.date}")
            print(f"   Reference ID: {transaction.reference_id}")
            print(f"   Reference Type: {transaction.reference_type}")
            print()
        
        # Get payments
        payments = Payment.objects.filter(apartment=apartment).order_by('-date')
        print(f"💰 Σύνολο πληρωμών: {payments.count()}")
        print()
        
        print("💳 ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΛΗΡΩΜΩΝ:")
        for i, payment in enumerate(payments, 1):
            print(f"{i}. ID: {payment.id}")
            print(f"   Ποσό: {payment.amount}€")
            print(f"   Ημερομηνία: {payment.date}")
            print(f"   Μέθοδος: {payment.method} ({payment.get_method_display()})")
            print(f"   Τύπος: {payment.payment_type} ({payment.get_payment_type_display()})")
            print(f"   Πληρωτής: {payment.payer_name}")
            print()
        
        # Check for duplicate transactions
        print("🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΟΤΥΠΙΩΝ:")
        transaction_groups = {}
        for transaction in transactions:
            key = (transaction.amount, transaction.date.date(), transaction.type)
            if key not in transaction_groups:
                transaction_groups[key] = []
            transaction_groups[key].append(transaction)
        
        duplicates_found = False
        for key, group in transaction_groups.items():
            if len(group) > 1:
                duplicates_found = True
                print(f"⚠️  Διπλοτυπία βρέθηκε:")
                print(f"   Ποσό: {key[0]}€")
                print(f"   Ημερομηνία: {key[1]}")
                print(f"   Τύπος: {key[2]}")
                print(f"   Αριθμός: {len(group)} συναλλαγές")
                for t in group:
                    print(f"     - ID: {t.id}, Περιγραφή: {t.description}")
                print()
        
        if not duplicates_found:
            print("✅ Δεν βρέθηκαν διπλοτυπίες")
        
        print("✅ Έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    debug_transactions()
