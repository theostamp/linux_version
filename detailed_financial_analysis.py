#!/usr/bin/env python3
"""
🔍 Λεπτομερής ανάλυση οικονομικών συναλλαγών

Αυτό το script θα αναλύσει λεπτομερώς τις συναλλαγές για να καταλάβουμε
την ανισορροπία στα οικονομικά δεδομένα.
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

def detailed_financial_analysis():
    """Λεπτομερής ανάλυση οικονομικών δεδομένων"""
    
    print("🔍 ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Ανάλυση δαπανών
        print("\n💰 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ:")
        expenses = Expense.objects.all()
        print(f"Συνολικές δαπάνες: {expenses.count()}")
        
        for expense in expenses:
            print(f"   {expense.title}: {expense.amount}€ ({expense.date})")
        
        # 2. Ανάλυση συναλλαγών
        print("\n💳 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ:")
        transactions = Transaction.objects.all()
        print(f"Συνολικές συναλλαγές: {transactions.count()}")
        
        # Ομαδοποίηση ανά τύπο
        transactions_by_type = {}
        for transaction in transactions:
            t_type = transaction.type
            if t_type not in transactions_by_type:
                transactions_by_type[t_type] = []
            transactions_by_type[t_type].append(transaction)
        
        for t_type, t_list in transactions_by_type.items():
            total_amount = sum(t.amount for t in t_list)
            print(f"\n   {t_type}: {total_amount}€ ({len(t_list)} συναλλαγές)")
            
            # Εμφάνιση λεπτομερειών για κάθε τύπο
            for transaction in t_list[:5]:  # Πρώτες 5 μόνο
                print(f"     - {transaction.amount}€ ({transaction.date}) - {transaction.description}")
            if len(t_list) > 5:
                print(f"     ... και {len(t_list) - 5} ακόμα")
        
        # 3. Ανάλυση πληρωμών
        print("\n💵 ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ:")
        payments = Payment.objects.all()
        print(f"Συνολικές πληρωμές: {payments.count()}")
        
        # Ομαδοποίηση ανά μέθοδο
        payments_by_method = {}
        for payment in payments:
            method = payment.method
            if method not in payments_by_method:
                payments_by_method[method] = []
            payments_by_method[method].append(payment)
        
        for method, p_list in payments_by_method.items():
            total_amount = sum(p.amount for p in p_list)
            print(f"\n   {method}: {total_amount}€ ({len(p_list)} πληρωμές)")
            
            # Εμφάνιση λεπτομερειών για κάθε μέθοδο
            for payment in p_list[:5]:  # Πρώτες 5 μόνο
                print(f"     - {payment.amount}€ ({payment.date}) - Διαμέρισμα {payment.apartment.number}")
            if len(p_list) > 5:
                print(f"     ... και {len(p_list) - 5} ακόμα")
        
        # 4. Ανάλυση ανά διαμέρισμα
        print("\n🏠 ΑΝΑΛΥΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        from apartments.models import Apartment
        
        apartments = Apartment.objects.all()
        for apartment in apartments:
            # Συναλλαγές διαμερίσματος
            apt_transactions = Transaction.objects.filter(apartment=apartment)
            apt_transactions_total = apt_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Πληρωμές διαμερίσματος
            apt_payments = Payment.objects.filter(apartment=apartment)
            apt_payments_total = apt_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            # Υπόλοιπο
            balance = apt_transactions_total - apt_payments_total
            
            print(f"   {apartment.number}:")
            print(f"     Συναλλαγές: {apt_transactions_total}€ ({apt_transactions.count()} συναλλαγές)")
            print(f"     Πληρωμές: {apt_payments_total}€ ({apt_payments.count()} πληρωμές)")
            print(f"     Υπόλοιπο: {balance}€")
        
        # 5. Έλεγχος για πιθανά προβλήματα
        print("\n🔍 ΕΛΕΓΧΟΣ ΠΙΘΑΝΩΝ ΠΡΟΒΛΗΜΑΤΩΝ:")
        
        # Έλεγχος για συναλλαγές χωρίς διαμέρισμα
        transactions_without_apartment = Transaction.objects.filter(apartment__isnull=True)
        if transactions_without_apartment.exists():
            print(f"⚠️ Βρέθηκαν {transactions_without_apartment.count()} συναλλαγές χωρίς διαμέρισμα")
        else:
            print("✅ Όλες οι συναλλαγές έχουν διαμέρισμα")
        
        # Έλεγχος για πληρωμές χωρίς διαμέρισμα
        payments_without_apartment = Payment.objects.filter(apartment__isnull=True)
        if payments_without_apartment.exists():
            print(f"⚠️ Βρέθηκαν {payments_without_apartment.count()} πληρωμές χωρίς διαμέρισμα")
        else:
            print("✅ Όλες οι πληρωμές έχουν διαμέρισμα")
        
        # Έλεγχος για μηδενικές τιμές
        zero_amount_transactions = Transaction.objects.filter(amount=0)
        if zero_amount_transactions.exists():
            print(f"⚠️ Βρέθηκαν {zero_amount_transactions.count()} συναλλαγές με μηδενικό ποσό")
        else:
            print("✅ Δεν βρέθηκαν συναλλαγές με μηδενικό ποσό")
        
        zero_amount_payments = Payment.objects.filter(amount=0)
        if zero_amount_payments.exists():
            print(f"⚠️ Βρέθηκαν {zero_amount_payments.count()} πληρωμές με μηδενικό ποσό")
        else:
            print("✅ Δεν βρέθηκαν πληρωμές με μηδενικό ποσό")
        
        # 6. Συμπέρασμα
        print("\n📋 ΣΥΜΠΕΡΑΣΜΑ:")
        
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
        print(f"💳 Συνολικές συναλλαγές: {total_transactions}€")
        print(f"💵 Συνολικές πληρωμές: {total_payments}€")
        
        # Υπολογισμός διαφορών
        expense_transaction_diff = abs(total_expenses - total_transactions)
        payment_transaction_diff = abs(total_payments - total_transactions)
        
        print(f"\nΔιαφορά δαπανών-συναλλαγών: {expense_transaction_diff}€")
        print(f"Διαφορά πληρωμών-συναλλαγών: {payment_transaction_diff}€")
        
        if expense_transaction_diff > Decimal('0.01'):
            print("❌ Υπάρχει ανισορροπία μεταξύ δαπανών και συναλλαγών")
        else:
            print("✅ Οι δαπάνες και συναλλαγές είναι ισορροπημένες")
        
        if payment_transaction_diff > Decimal('0.01'):
            print("❌ Υπάρχει ανισορροπία μεταξύ πληρωμών και συναλλαγών")
            print("   Αυτό είναι το κύριο πρόβλημα!")
        else:
            print("✅ Οι πληρωμές και συναλλαγές είναι ισορροπημένες")

if __name__ == "__main__":
    detailed_financial_analysis()
