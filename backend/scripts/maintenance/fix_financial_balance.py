#!/usr/bin/env python3
"""
🔧 Script για διόρθωση της ανισορροπίας οικονομικών δεδομένων

Το πρόβλημα είναι:
- Συνολικές δαπάνες: 900.00€
- Συνολικές συναλλαγές: 1005.84€ (διαφορά 105.84€)
- Συνολικές πληρωμές: 2139.56€ (διαφορά 1133.72€)

Αυτό το script θα αναλύσει και θα διορθώσει το πρόβλημα.
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
from django.db.models import Sum
from decimal import Decimal

def analyze_and_fix_financial_balance():
    """Ανάλυση και διόρθωση ανισορροπίας οικονομικών δεδομένων"""
    
    print("🔧 ΑΝΑΛΥΣΗ ΚΑΙ ΔΙΟΡΘΩΣΗ ΑΝΙΣΟΡΡΟΠΙΑΣ")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Ανάλυση του προβλήματος
        print("\n🔍 ΑΝΑΛΥΣΗ ΤΟΥ ΠΡΟΒΛΗΜΑΤΟΣ:")
        
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
        print(f"💳 Συνολικές συναλλαγές: {total_transactions}€")
        print(f"💵 Συνολικές πληρωμές: {total_payments}€")
        
        # Υπολογισμός διαφορών
        expense_transaction_diff = total_transactions - total_expenses
        payment_transaction_diff = total_payments - total_transactions
        
        print(f"\nΔιαφορά συναλλαγών-δαπανών: {expense_transaction_diff}€")
        print(f"Διαφορά πληρωμών-συναλλαγών: {payment_transaction_diff}€")
        
        # 2. Ανάλυση των συναλλαγών common_expense_payment
        print("\n🔍 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ common_expense_payment:")
        
        common_expense_payments = Transaction.objects.filter(type='common_expense_payment')
        total_common_payments = common_expense_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"Συνολικές συναλλαγές common_expense_payment: {total_common_payments}€")
        print(f"Αριθμός συναλλαγών: {common_expense_payments.count()}")
        
        # Εμφάνιση λεπτομερειών
        for transaction in common_expense_payments:
            print(f"   {transaction.amount}€ - {transaction.apartment.number} - {transaction.description}")
        
        # 3. Έλεγχος αν οι συναλλαγές common_expense_payment είναι διπλές πληρωμές
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΠΛΗΡΩΜΩΝ:")
        
        # Βρίσκουμε πληρωμές που μπορεί να είναι διπλές
        duplicate_payments = []
        
        for payment in Payment.objects.all():
            # Έλεγχος αν υπάρχει συναλλαγή common_expense_payment για το ίδιο διαμέρισμα και ποσό
            matching_transaction = Transaction.objects.filter(
                type='common_expense_payment',
                apartment=payment.apartment,
                amount=payment.amount,
                date__date=payment.date
            ).first()
            
            if matching_transaction:
                duplicate_payments.append({
                    'payment': payment,
                    'transaction': matching_transaction
                })
        
        print(f"Βρέθηκαν {len(duplicate_payments)} πιθανές διπλές πληρωμές")
        
        for item in duplicate_payments:
            payment = item['payment']
            transaction = item['transaction']
            print(f"   Διαμέρισμα {payment.apartment.number}: {payment.amount}€ ({payment.date})")
            print(f"     Πληρωμή ID: {payment.id}")
            print(f"     Συναλλαγή ID: {transaction.id}")
        
        # 4. Διόρθωση του προβλήματος
        print("\n🔧 ΔΙΟΡΘΩΣΗ ΤΟΥ ΠΡΟΒΛΗΜΑΤΟΣ:")
        
        if len(duplicate_payments) > 0:
            print("Θα διαγράψουμε τις διπλές συναλλαγές common_expense_payment...")
            
            deleted_count = 0
            for item in duplicate_payments:
                transaction = item['transaction']
                print(f"Διαγραφή συναλλαγής {transaction.id}: {transaction.amount}€ - {transaction.apartment.number}")
                transaction.delete()
                deleted_count += 1
            
            print(f"Διαγράφηκαν {deleted_count} διπλές συναλλαγές")
            
            # Επαναυπολογισμός
            new_total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            new_expense_transaction_diff = new_total_transactions - total_expenses
            new_payment_transaction_diff = total_payments - new_total_transactions
            
            print("\nΜετά τη διόρθωση:")
            print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
            print(f"💳 Συνολικές συναλλαγές: {new_total_transactions}€")
            print(f"💵 Συνολικές πληρωμές: {total_payments}€")
            print(f"Διαφορά συναλλαγών-δαπανών: {new_expense_transaction_diff}€")
            print(f"Διαφορά πληρωμών-συναλλαγών: {new_payment_transaction_diff}€")
            
            if abs(new_expense_transaction_diff) < Decimal('0.01') and abs(new_payment_transaction_diff) < Decimal('0.01'):
                print("✅ Η ανισορροπία διορθώθηκε επιτυχώς!")
            else:
                print("⚠️ Η ανισορροπία δεν διορθώθηκε πλήρως. Χρειάζεται περαιτέρω ανάλυση.")
        else:
            print("Δεν βρέθηκαν διπλές συναλλαγές για διαγραφή.")
            
            # Εναλλακτική λύση: Δημιουργία συναλλαγών για τις πληρωμές που λείπουν
            print("\nΕναλλακτική λύση: Δημιουργία συναλλαγών για πληρωμές που λείπουν...")
            
            # Βρίσκουμε πληρωμές που δεν έχουν αντίστοιχη συναλλαγή
            payments_without_transaction = []
            
            for payment in Payment.objects.all():
                # Έλεγχος αν υπάρχει συναλλαγή payment_received για αυτή την πληρωμή
                matching_transaction = Transaction.objects.filter(
                    type='payment_received',
                    apartment=payment.apartment,
                    amount=payment.amount,
                    date__date=payment.date
                ).first()
                
                if not matching_transaction:
                    payments_without_transaction.append(payment)
            
            print(f"Βρέθηκαν {len(payments_without_transaction)} πληρωμές χωρίς αντίστοιχη συναλλαγή")
            
            if len(payments_without_transaction) > 0:
                print("Δημιουργία συναλλαγών payment_received...")
                
                created_count = 0
                for payment in payments_without_transaction:
                    # Δημιουργία συναλλαγής payment_received
                    transaction = Transaction.objects.create(
                        apartment=payment.apartment,
                        amount=payment.amount,
                        type='payment_received',
                        description=f'Είσπραξη πληρωμής - {payment.apartment.number}',
                        date=payment.date
                    )
                    print(f"Δημιουργήθηκε συναλλαγή {transaction.id}: {transaction.amount}€ - {transaction.apartment.number}")
                    created_count += 1
                
                print(f"Δημιουργήθηκαν {created_count} συναλλαγές")
                
                # Επαναυπολογισμός
                final_total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
                final_expense_transaction_diff = final_total_transactions - total_expenses
                final_payment_transaction_diff = total_payments - final_total_transactions
                
                print("\nΜετά τη διόρθωση:")
                print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
                print(f"💳 Συνολικές συναλλαγές: {final_total_transactions}€")
                print(f"💵 Συνολικές πληρωμές: {total_payments}€")
                print(f"Διαφορά συναλλαγών-δαπανών: {final_expense_transaction_diff}€")
                print(f"Διαφορά πληρωμών-συναλλαγών: {final_payment_transaction_diff}€")
                
                if abs(final_expense_transaction_diff) < Decimal('0.01') and abs(final_payment_transaction_diff) < Decimal('0.01'):
                    print("✅ Η ανισορροπία διορθώθηκε επιτυχώς!")
                else:
                    print("⚠️ Η ανισορροπία δεν διορθώθηκε πλήρως. Χρειάζεται περαιτέρω ανάλυση.")
        
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

if __name__ == "__main__":
    analyze_and_fix_financial_balance()
