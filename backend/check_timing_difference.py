#!/usr/bin/env python3
"""
🔍 Script για έλεγχο χρονικής διαφοράς μεταξύ καταχωρήσεων πληρωμών και συναλλαγών

Αυτό το script θα ελέγξει πότε καταχωρήθηκαν οι πληρωμές και πότε δημιουργήθηκαν οι συναλλαγές
για να καταλάβουμε αν υπάρχει πραγματική χρονική διαφορά.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from django.db.models import Sum, Q, Count
from decimal import Decimal
from datetime import datetime, timedelta

def check_timing_difference():
    """Έλεγχος χρονικής διαφοράς μεταξύ πληρωμών και συναλλαγών"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΧΡΟΝΙΚΗΣ ΔΙΑΦΟΡΑΣ")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Ανάλυση πληρωμών χωρίς συναλλαγές
        print("\n🔍 ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ ΧΩΡΙΣ ΣΥΝΑΛΛΑΓΕΣ:")
        
        payments = Payment.objects.all().order_by('created_at')
        payments_without_transactions = []
        
        for payment in payments:
            # Έλεγχος αν υπάρχει συναλλαγή payment_received για αυτή την πληρωμή
            matching_transaction = Transaction.objects.filter(
                type='payment_received',
                apartment=payment.apartment,
                amount=payment.amount,
                date__date=payment.date
            ).first()
            
            if not matching_transaction:
                payments_without_transactions.append(payment)
        
        print(f"Βρέθηκαν {len(payments_without_transactions)} πληρωμές χωρίς αντίστοιχες συναλλαγές")
        
        # 2. Ανάλυση χρονικών διαφορών
        print("\n📊 ΑΝΑΛΥΣΗ ΧΡΟΝΙΚΩΝ ΔΙΑΦΟΡΩΝ:")
        
        for payment in payments_without_transactions:
            print(f"\n💰 Πληρωμή {payment.id}:")
            print(f"   Ποσό: {payment.amount}€")
            print(f"   Διαμέρισμα: {payment.apartment.number}")
            print(f"   Ημερομηνία πληρωμής: {payment.date}")
            print(f"   Καταχωρήθηκε: {payment.created_at}")
            print(f"   Μέθοδος: {payment.method}")
            
            # Έλεγχος για συναλλαγές με παρόμοια ποσά και διαμερίσματα
            similar_transactions = Transaction.objects.filter(
                type='payment_received',
                apartment=payment.apartment,
                amount=payment.amount
            ).order_by('created_at')
            
            if similar_transactions.exists():
                for txn in similar_transactions:
                    time_diff = abs((txn.created_at - payment.created_at).total_seconds())
                    print(f"   🔍 Παρόμοια συναλλαγή {txn.id}:")
                    print(f"      Δημιουργήθηκε: {txn.created_at}")
                    print(f"      Χρονική διαφορά: {time_diff:.0f} δευτερόλεπτα")
            else:
                print(f"   ❌ Δεν βρέθηκαν παρόμοιες συναλλαγές")
        
        # 3. Ανάλυση όλων των πληρωμών και συναλλαγών
        print("\n📈 ΣΥΝΟΛΙΚΗ ΑΝΑΛΥΣΗ:")
        
        all_payments = Payment.objects.all().order_by('created_at')
        all_payment_transactions = Transaction.objects.filter(type='payment_received').order_by('created_at')
        
        print(f"Συνολικές πληρωμές: {all_payments.count()}")
        print(f"Συνολικές συναλλαγές payment_received: {all_payment_transactions.count()}")
        
        # 4. Έλεγχος χρονικής σειράς
        print("\n⏰ ΧΡΟΝΙΚΗ ΣΕΙΡΑ:")
        
        payment_times = [(p.created_at, f"Πληρωμή {p.id}: {p.amount}€ - {p.apartment.number}") for p in all_payments]
        transaction_times = [(t.created_at, f"Συναλλαγή {t.id}: {t.amount}€ - {t.apartment.number}") for t in all_payment_transactions]
        
        all_events = payment_times + transaction_times
        all_events.sort(key=lambda x: x[0])
        
        print("Χρονική σειρά καταχωρήσεων:")
        for i, (timestamp, description) in enumerate(all_events[:20]):  # Πρώτες 20 μόνο
            print(f"   {i+1:2d}. {timestamp.strftime('%H:%M:%S')} - {description}")
        
        if len(all_events) > 20:
            print(f"   ... και {len(all_events) - 20} ακόμα")
        
        # 5. Έλεγχος για διπλές καταχωρήσεις
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ:")
        
        duplicate_payments = Payment.objects.values('apartment__number', 'amount', 'date').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicate_payments.exists():
            print("Βρέθηκαν πιθανές διπλές πληρωμές:")
            for item in duplicate_payments:
                print(f"   Διαμέρισμα {item['apartment__number']}: {item['amount']}€ ({item['count']} φορές)")
        else:
            print("Δεν βρέθηκαν διπλές πληρωμές")
        
        # 6. Συμπέρασμα
        print("\n📋 ΣΥΜΠΕΡΑΣΜΑ:")
        
        if len(payments_without_transactions) > 0:
            print(f"⚠️ Υπάρχουν {len(payments_without_transactions)} πληρωμές χωρίς συναλλαγές")
            print("   Πιθανές αιτίες:")
            print("   - Οι συναλλαγές δεν έχουν δημιουργηθεί ακόμα")
            print("   - Υπάρχει πρόβλημα στο σύστημα δημιουργίας συναλλαγών")
            print("   - Οι πληρωμές καταχωρήθηκαν χειροκίνητα χωρίς αυτόματη δημιουργία συναλλαγών")
        else:
            print("✅ Όλες οι πληρωμές έχουν αντίστοιχες συναλλαγές")

if __name__ == "__main__":
    check_timing_difference()
