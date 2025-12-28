#!/usr/bin/env python3
"""
🔧 Script για διόρθωση της ανισορροπίας οικονομικών δεδομένων - Έκδοση 2

Το πρόβλημα είναι ότι υπάρχουν διπλές συναλλαγές common_expense_payment που
δημιουργούν ανισορροπία. Αυτό το script θα διορθώσει το πρόβλημα σωστά.
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
from django.db.models import Sum, Count
from decimal import Decimal

def fix_financial_balance_v2():
    """Διόρθωση ανισορροπίας οικονομικών δεδομένων - Έκδοση 2"""
    
    print("🔧 ΔΙΟΡΘΩΣΗ ΑΝΙΣΟΡΡΟΠΙΑΣ - ΕΚΔΟΣΗ 2")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Αρχική κατάσταση
        print("\n🔍 ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ:")
        
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
        print(f"💳 Συνολικές συναλλαγές: {total_transactions}€")
        print(f"💵 Συνολικές πληρωμές: {total_payments}€")
        
        # 2. Ανάλυση των συναλλαγών ανά τύπο
        print("\n📊 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ ΑΝΑ ΤΥΠΟ:")
        
        transactions_by_type = Transaction.objects.values('type').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        for item in transactions_by_type:
            print(f"   {item['type']}: {item['total']}€ ({item['count']} συναλλαγές)")
        
        # 3. Έλεγχος για διπλές συναλλαγές common_expense_payment
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΣΥΝΑΛΛΑΓΩΝ:")
        
        # Βρίσκουμε συναλλαγές common_expense_payment που έχουν αντίστοιχες πληρωμές
        common_expense_payments = Transaction.objects.filter(type='common_expense_payment')
        
        duplicate_transactions = []
        for transaction in common_expense_payments:
            # Έλεγχος αν υπάρχει πληρωμή με το ίδιο ποσό και διαμέρισμα
            matching_payment = Payment.objects.filter(
                apartment=transaction.apartment,
                amount=transaction.amount,
                date__date=transaction.date.date()
            ).first()
            
            if matching_payment:
                duplicate_transactions.append({
                    'transaction': transaction,
                    'payment': matching_payment
                })
        
        print(f"Βρέθηκαν {len(duplicate_transactions)} διπλές συναλλαγές common_expense_payment")
        
        # 4. Διόρθωση - Διαγραφή μόνο των διπλών συναλλαγών
        print("\n🔧 ΔΙΟΡΘΩΣΗ:")
        
        if len(duplicate_transactions) > 0:
            print("Διαγραφή διπλών συναλλαγών common_expense_payment...")
            
            deleted_count = 0
            for item in duplicate_transactions:
                transaction = item['transaction']
                payment = item['payment']
                
                print(f"   Διαγραφή συναλλαγής {transaction.id}: {transaction.amount}€ - {transaction.apartment.number}")
                print(f"     (υπάρχει πληρωμή {payment.id}: {payment.amount}€ - {payment.apartment.number})")
                
                transaction.delete()
                deleted_count += 1
            
            print(f"Διαγράφηκαν {deleted_count} διπλές συναλλαγές")
            
            # Επαναυπολογισμός
            new_total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            print("\nΜετά τη διόρθωση:")
            print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
            print(f"💳 Συνολικές συναλλαγές: {new_total_transactions}€")
            print(f"💵 Συνολικές πληρωμές: {total_payments}€")
            
            # Υπολογισμός νέων διαφορών
            new_expense_transaction_diff = abs(new_total_transactions - total_expenses)
            new_payment_transaction_diff = abs(total_payments - new_total_transactions)
            
            print(f"Διαφορά δαπανών-συναλλαγών: {new_expense_transaction_diff}€")
            print(f"Διαφορά πληρωμών-συναλλαγών: {new_payment_transaction_diff}€")
            
            if new_expense_transaction_diff < Decimal('0.01') and new_payment_transaction_diff < Decimal('0.01'):
                print("✅ Η ανισορροπία διορθώθηκε επιτυχώς!")
            else:
                print("⚠️ Η ανισορροπία δεν διορθώθηκε πλήρως.")
        else:
            print("Δεν βρέθηκαν διπλές συναλλαγές για διαγραφή.")
        
        # 5. Τελική επαλήθευση
        print("\n🔍 ΤΕΛΙΚΗ ΕΠΑΛΗΘΕΥΣΗ:")
        
        final_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        final_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        final_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"💰 Συνολικές δαπάνες: {final_expenses}€")
        print(f"💳 Συνολικές συναλλαγές: {final_transactions}€")
        print(f"💵 Συνολικές πληρωμές: {final_payments}€")
        
        final_diff1 = abs(final_transactions - final_expenses)
        final_diff2 = abs(final_payments - final_transactions)
        
        print(f"Διαφορά δαπανών-συναλλαγών: {final_diff1}€")
        print(f"Διαφορά πληρωμών-συναλλαγών: {final_diff2}€")
        
        if final_diff1 < Decimal('0.01') and final_diff2 < Decimal('0.01'):
            print("✅ Τα οικονομικά δεδομένα είναι τώρα ισορροπημένα!")
        else:
            print("❌ Χρειάζεται περαιτέρω διόρθωση.")
            
            # Επιπλέον ανάλυση
            print("\n🔍 ΕΠΙΠΛΕΟΝ ΑΝΑΛΥΣΗ:")
            
            # Ανάλυση συναλλαγών ανά τύπο μετά τη διόρθωση
            final_transactions_by_type = Transaction.objects.values('type').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('-total')
            
            print("Συναλλαγές μετά τη διόρθωση:")
            for item in final_transactions_by_type:
                print(f"   {item['type']}: {item['total']}€ ({item['count']} συναλλαγές)")

if __name__ == "__main__":
    fix_financial_balance_v2()
