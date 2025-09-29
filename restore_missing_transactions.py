#!/usr/bin/env python3
"""
🔧 Script για επαναφορά των συναλλαγών που λείπουν

Μετά τη διαγραφή των διπλών συναλλαγών, χρειαζόμαστε να δημιουργήσουμε
τις συναλλαγές που λείπουν για να διορθώσουμε την ανισορροπία.
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

def restore_missing_transactions():
    """Επαναφορά των συναλλαγών που λείπουν"""
    
    print("🔧 ΕΠΑΝΑΦΟΡΑ ΣΥΝΑΛΛΑΓΩΝ ΠΟΥ ΛΕΙΠΟΥΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Τρέχουσα κατάσταση
        print("\n🔍 ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ:")
        
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
        print(f"💳 Συνολικές συναλλαγές: {total_transactions}€")
        print(f"💵 Συνολικές πληρωμές: {total_payments}€")
        
        # 2. Ανάλυση των συναλλαγών ανά τύπο
        print("\n📊 ΣΥΝΑΛΛΑΓΕΣ ΑΝΑ ΤΥΠΟ:")
        
        transactions_by_type = Transaction.objects.values('type').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        for item in transactions_by_type:
            print(f"   {item['type']}: {item['total']}€ ({item['count']} συναλλαγές)")
        
        # 3. Υπολογισμός των συναλλαγών που λείπουν
        print("\n🔍 ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΑΛΛΑΓΩΝ ΠΟΥ ΛΕΙΠΟΥΝ:")
        
        # Χρειαζόμαστε συναλλαγές για κάθε δαπάνη
        expenses = Expense.objects.all()
        print(f"Αριθμός δαπανών: {expenses.count()}")
        
        # Χρειαζόμαστε συναλλαγές για κάθε πληρωμή
        payments = Payment.objects.all()
        print(f"Αριθμός πληρωμών: {payments.count()}")
        
        # 4. Δημιουργία συναλλαγών για τις δαπάνες
        print("\n🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΓΙΑ ΔΑΠΑΝΕΣ:")
        
        # Έλεγχος αν υπάρχουν ήδη συναλλαγές common_expense_charge
        existing_charge_transactions = Transaction.objects.filter(type='common_expense_charge')
        print(f"Υπάρχουσες συναλλαγές common_expense_charge: {existing_charge_transactions.count()}")
        
        if existing_charge_transactions.count() == 0:
            print("Δημιουργία συναλλαγών common_expense_charge για κάθε δαπάνη...")
            
            from apartments.models import Apartment
            apartments = Apartment.objects.all()
            
            created_count = 0
            for expense in expenses:
                # Δημιουργία συναλλαγής για κάθε διαμέρισμα
                for apartment in apartments:
                    # Υπολογισμός μεριδίου ανά διαμέρισμα (ίσο μερίδιο)
                    share_amount = expense.amount / apartments.count()
                    
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        amount=-share_amount,  # Αρνητικό για χρέωση
                        type='common_expense_charge',
                        description=f'Χρέωση κοινοχρήστων {expense.title} - {apartment.number}',
                        date=expense.date
                    )
                    created_count += 1
            
            print(f"Δημιουργήθηκαν {created_count} συναλλαγές common_expense_charge")
        else:
            print("Οι συναλλαγές common_expense_charge υπάρχουν ήδη")
        
        # 5. Δημιουργία συναλλαγών για τις πληρωμές
        print("\n🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΓΙΑ ΠΛΗΡΩΜΕΣ:")
        
        # Έλεγχος αν υπάρχουν ήδη συναλλαγές payment_received
        existing_payment_transactions = Transaction.objects.filter(type='payment_received')
        print(f"Υπάρχουσες συναλλαγές payment_received: {existing_payment_transactions.count()}")
        
        if existing_payment_transactions.count() == 0:
            print("Δημιουργία συναλλαγών payment_received για κάθε πληρωμή...")
            
            created_count = 0
            for payment in payments:
                transaction = Transaction.objects.create(
                    apartment=payment.apartment,
                    amount=payment.amount,
                    type='payment_received',
                    description=f'Είσπραξη πληρωμής - {payment.apartment.number}',
                    date=payment.date
                )
                created_count += 1
            
            print(f"Δημιουργήθηκαν {created_count} συναλλαγές payment_received")
        else:
            print("Οι συναλλαγές payment_received υπάρχουν ήδη")
        
        # 6. Τελική επαλήθευση
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
            
            final_transactions_by_type = Transaction.objects.values('type').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('-total')
            
            print("Συναλλαγές μετά την επαναφορά:")
            for item in final_transactions_by_type:
                print(f"   {item['type']}: {item['total']}€ ({item['count']} συναλλαγές)")

if __name__ == "__main__":
    restore_missing_transactions()
