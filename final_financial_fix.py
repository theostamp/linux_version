#!/usr/bin/env python3
"""
🔧 Τελικό script για διόρθωση της ανισορροπίας οικονομικών δεδομένων

Αυτό το script θα διορθώσει τελικά την ανισορροπία δημιουργώντας
τις σωστές συναλλαγές για κάθε πληρωμή που λείπει.
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

def final_financial_fix():
    """Τελική διόρθωση ανισορροπίας οικονομικών δεδομένων"""
    
    print("🔧 ΤΕΛΙΚΗ ΔΙΟΡΘΩΣΗ ΑΝΙΣΟΡΡΟΠΙΑΣ")
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
        
        # 3. Έλεγχος για πληρωμές που λείπουν από συναλλαγές
        print("\n🔍 ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ ΠΟΥ ΛΕΙΠΟΥΝ:")
        
        payments = Payment.objects.all()
        missing_payment_transactions = []
        
        for payment in payments:
            # Έλεγχος αν υπάρχει συναλλαγή payment_received για αυτή την πληρωμή
            matching_transaction = Transaction.objects.filter(
                type='payment_received',
                apartment=payment.apartment,
                amount=payment.amount,
                date__date=payment.date
            ).first()
            
            if not matching_transaction:
                missing_payment_transactions.append(payment)
        
        print(f"Βρέθηκαν {len(missing_payment_transactions)} πληρωμές χωρίς αντίστοιχη συναλλαγή")
        
        # 4. Δημιουργία συναλλαγών για τις πληρωμές που λείπουν
        print("\n🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΓΙΑ ΠΛΗΡΩΜΕΣ ΠΟΥ ΛΕΙΠΟΥΝ:")
        
        if len(missing_payment_transactions) > 0:
            created_count = 0
            for payment in missing_payment_transactions:
                from django.utils import timezone
                from datetime import datetime
                
                # Μετατροπή date σε datetime
                payment_datetime = datetime.combine(payment.date, datetime.min.time())
                payment_datetime = timezone.make_aware(payment_datetime)
                
                transaction = Transaction.objects.create(
                    apartment=payment.apartment,
                    amount=payment.amount,
                    type='payment_received',
                    description=f'Είσπραξη πληρωμής - {payment.apartment.number}',
                    date=payment_datetime
                )
                print(f"   Δημιουργήθηκε συναλλαγή {transaction.id}: {transaction.amount}€ - {transaction.apartment.number}")
                created_count += 1
            
            print(f"Δημιουργήθηκαν {created_count} συναλλαγές payment_received")
        else:
            print("Όλες οι πληρωμές έχουν αντίστοιχες συναλλαγές")
        
        # 5. Έλεγχος για δαπάνες που λείπουν από συναλλαγές
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΠΟΥ ΛΕΙΠΟΥΝ:")
        
        expenses = Expense.objects.all()
        missing_expense_transactions = []
        
        for expense in expenses:
            # Έλεγχος αν υπάρχουν συναλλαγές common_expense_charge για αυτή την δαπάνη
            matching_transactions = Transaction.objects.filter(
                type='common_expense_charge',
                date__date=expense.date
            )
            
            if matching_transactions.count() == 0:
                missing_expense_transactions.append(expense)
        
        print(f"Βρέθηκαν {len(missing_expense_transactions)} δαπάνες χωρίς αντίστοιχες συναλλαγές")
        
        # 6. Δημιουργία συναλλαγών για τις δαπάνες που λείπουν
        print("\n🔧 ΔΗΜΙΟΥΡΓΙΑ ΣΥΝΑΛΛΑΓΩΝ ΓΙΑ ΔΑΠΑΝΕΣ ΠΟΥ ΛΕΙΠΟΥΝ:")
        
        if len(missing_expense_transactions) > 0:
            from apartments.models import Apartment
            apartments = Apartment.objects.all()
            
            created_count = 0
            for expense in missing_expense_transactions:
                # Δημιουργία συναλλαγής για κάθε διαμέρισμα
                for apartment in apartments:
                    # Υπολογισμός μεριδίου ανά διαμέρισμα (ίσο μερίδιο)
                    share_amount = expense.amount / apartments.count()
                    
                    from django.utils import timezone
                    from datetime import datetime
                    
                    # Μετατροπή date σε datetime
                    expense_datetime = datetime.combine(expense.date, datetime.min.time())
                    expense_datetime = timezone.make_aware(expense_datetime)
                    
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        amount=-share_amount,  # Αρνητικό για χρέωση
                        type='common_expense_charge',
                        description=f'Χρέωση κοινοχρήστων {expense.title} - {apartment.number}',
                        date=expense_datetime
                    )
                    created_count += 1
            
            print(f"Δημιουργήθηκαν {created_count} συναλλαγές common_expense_charge")
        else:
            print("Όλες οι δαπάνες έχουν αντίστοιχες συναλλαγές")
        
        # 7. Τελική επαλήθευση
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
            
            print("Συναλλαγές μετά τη διόρθωση:")
            for item in final_transactions_by_type:
                print(f"   {item['type']}: {item['total']}€ ({item['count']} συναλλαγές)")
            
            # Ανάλυση ανά διαμέρισμα
            print("\n🏠 ΑΝΑΛΥΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
            from apartments.models import Apartment
            
            apartments = Apartment.objects.all()
            for apartment in apartments:
                apt_transactions = Transaction.objects.filter(apartment=apartment)
                apt_transactions_total = apt_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                apt_payments = Payment.objects.filter(apartment=apartment)
                apt_payments_total = apt_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
                
                balance = apt_transactions_total - apt_payments_total
                
                print(f"   {apartment.number}: Συναλλαγές={apt_transactions_total}€, Πληρωμές={apt_payments_total}€, Υπόλοιπο={balance}€")

if __name__ == "__main__":
    final_financial_fix()
