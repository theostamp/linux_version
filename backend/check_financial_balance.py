#!/usr/bin/env python3
"""
🔍 Script για ανάλυση του προβλήματος ανισορροπίας οικονομικών δεδομένων

Το σύστημα αναφέρει:
- Συνολικές πληρωμές: 2139.56€
- Συνολικές δαπάνες: 900.00€
- Ανισορροπία: 1239.56€

Αυτό το script θα αναλύσει τι συμβαίνει.
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

def analyze_financial_balance():
    """Ανάλυση ανισορροπίας οικονομικών δεδομένων"""
    
    print("🔍 ΑΝΑΛΥΣΗ ΑΝΙΣΟΡΡΟΠΙΑΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    with schema_context('demo'):
        # 1. Συνολικές δαπάνες
        total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
        
        # 2. Συνολικές συναλλαγές (χρεώσεις)
        total_transactions = Transaction.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        print(f"💳 Συνολικές συναλλαγές: {total_transactions}€")
        
        # 3. Συνολικές πληρωμές
        total_payments = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        print(f"💵 Συνολικές πληρωμές: {total_payments}€")
        
        print("-" * 40)
        
        # 4. Ανάλυση ανά τύπο
        print("\n📊 ΑΝΑΛΥΣΗ ΑΝΑ ΤΥΠΟ:")
        
        # Δαπάνες ανά κατηγορία
        expenses_by_category = Expense.objects.values('category').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        print("\n🏷️ Δαπάνες ανά κατηγορία:")
        for item in expenses_by_category:
            print(f"   {item['category']}: {item['total']}€")
        
        # Συναλλαγές ανά τύπο
        transactions_by_type = Transaction.objects.values('type').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        print("\n💳 Συναλλαγές ανά τύπο:")
        for item in transactions_by_type:
            print(f"   {item['type']}: {item['total']}€")
        
        # Πληρωμές ανά μέθοδο
        payments_by_method = Payment.objects.values('method').annotate(
            total=Sum('amount')
        ).order_by('-total')
        
        print("\n💵 Πληρωμές ανά μέθοδο:")
        for item in payments_by_method:
            print(f"   {item['method']}: {item['total']}€")
        
        print("-" * 40)
        
        # 5. Υπολογισμός ισορροπίας
        print("\n⚖️ ΥΠΟΛΟΓΙΣΜΟΣ ΙΣΟΡΡΟΠΙΑΣ:")
        
        # Θεωρητική ισορροπία: Δαπάνες - Πληρωμές
        theoretical_balance = total_expenses - total_payments
        print(f"Θεωρητική ισορροπία (Δαπάνες - Πληρωμές): {theoretical_balance}€")
        
        # Πραγματική ισορροπία από συναλλαγές
        actual_balance = total_transactions
        print(f"Πραγματική ισορροπία (Συναλλαγές): {actual_balance}€")
        
        # Διαφορά
        difference = abs(theoretical_balance - actual_balance)
        print(f"Διαφορά: {difference}€")
        
        print("-" * 40)
        
        # 6. Έλεγχος για διπλές εγγραφές
        print("\n🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΕΓΓΡΑΦΩΝ:")
        
        # Διπλές δαπάνες
        duplicate_expenses = Expense.objects.values('title', 'amount', 'date').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicate_expenses.exists():
            print("⚠️ Βρέθηκαν διπλές δαπάνες:")
            for item in duplicate_expenses:
                print(f"   {item['title']}: {item['amount']}€ ({item['count']} φορές)")
        else:
            print("✅ Δεν βρέθηκαν διπλές δαπάνες")
        
        # Διπλές πληρωμές
        duplicate_payments = Payment.objects.values('apartment__number', 'amount', 'date').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicate_payments.exists():
            print("⚠️ Βρέθηκαν διπλές πληρωμές:")
            for item in duplicate_payments:
                print(f"   Διαμέρισμα {item['apartment__number']}: {item['amount']}€ ({item['count']} φορές)")
        else:
            print("✅ Δεν βρέθηκαν διπλές πληρωμές")
        
        # 7. Έλεγχος για αρνητικές τιμές
        print("\n🔍 ΕΛΕΓΧΟΣ ΑΡΝΗΤΙΚΩΝ ΤΙΜΩΝ:")
        
        negative_expenses = Expense.objects.filter(amount__lt=0)
        if negative_expenses.exists():
            print("⚠️ Βρέθηκαν αρνητικές δαπάνες:")
            for expense in negative_expenses:
                print(f"   {expense.title}: {expense.amount}€")
        else:
            print("✅ Δεν βρέθηκαν αρνητικές δαπάνες")
        
        negative_payments = Payment.objects.filter(amount__lt=0)
        if negative_payments.exists():
            print("⚠️ Βρέθηκαν αρνητικές πληρωμές:")
            for payment in negative_payments:
                print(f"   Διαμέρισμα {payment.apartment.number}: {payment.amount}€")
        else:
            print("✅ Δεν βρέθηκαν αρνητικές πληρωμές")
        
        # 8. Συμπέρασμα
        print("\n📋 ΣΥΜΠΕΡΑΣΜΑ:")
        if difference > Decimal('0.01'):  # Ανοχή 1 λεπτό
            print("❌ Υπάρχει ανισορροπία στα οικονομικά δεδομένα")
            print(f"   Διαφορά: {difference}€")
            
            if total_payments > total_expenses:
                print("   Αιτία: Περισσότερες πληρωμές από δαπάνες")
                print("   Πιθανές αιτίες:")
                print("   - Διπλές πληρωμές")
                print("   - Λάθος καταχώρηση ποσών")
                print("   - Πληρωμές για περιόδους χωρίς δαπάνες")
            else:
                print("   Αιτία: Περισσότερες δαπάνες από πληρωμές")
                print("   Πιθανές αιτίες:")
                print("   - Διπλές δαπάνες")
                print("   - Λάθος καταχώρηση ποσών")
                print("   - Δαπάνες χωρίς αντίστοιχες πληρωμές")
        else:
            print("✅ Τα οικονομικά δεδομένα είναι ισορροπημένα")

if __name__ == "__main__":
    analyze_financial_balance()
