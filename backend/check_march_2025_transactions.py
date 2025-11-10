#!/usr/bin/env python3
"""
Έλεγχος συναλλαγών Μαρτίου 2025 για το κτίριο Αλκμάνος 22
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Transaction, Payment, Expense
from buildings.models import Building
from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from django.db.models import Sum

def check_march_2025_transactions():
    """Έλεγχος συναλλαγών Μαρτίου 2025"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΜΑΡΤΙΟΥ 2025")
        print("=" * 60)
        
        # 1. Εύρεση κτιρίου Αλκμάνος 22
        try:
            building = Building.objects.get(id=1)  # Αλκμάνος 22
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
        except Building.DoesNotExist:
            print("❌ Κτίριο Αλκμάνος 22 δεν βρέθηκε!")
            return
        
        print("\n" + "=" * 60)
        
        # 2. Έλεγχος συναλλαγών Μαρτίου 2025
        march_start = timezone.make_aware(datetime(2025, 3, 1, 0, 0, 0))
        march_end = timezone.make_aware(datetime(2025, 4, 1, 0, 0, 0))
        
        print(f"📅 Περίοδος: {march_start.date()} - {march_end.date()}")
        
        # Όλες οι συναλλαγές Μαρτίου 2025
        march_transactions = Transaction.objects.filter(
            building_id=building.id,
            date__gte=march_start,
            date__lt=march_end
        ).order_by('date', 'id')
        
        print(f"\n📊 ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ ΜΑΡΤΙΟΥ 2025: {march_transactions.count()}")
        
        if march_transactions.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΣΥΝΑΛΛΑΓΩΝ:")
            
            total_charges = Decimal('0.00')
            total_payments = Decimal('0.00')
            
            for i, transaction in enumerate(march_transactions, 1):
                print(f"\n   {i}. {transaction.date.date()} - {transaction.type}")
                print(f"      Διαμέρισμα: {transaction.apartment.number if transaction.apartment else 'N/A'}")
                print(f"      Ποσό: {transaction.amount}€")
                print(f"      Περιγραφή: {transaction.description or 'N/A'}")
                
                if transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                      'interest_charge', 'penalty_charge']:
                    total_charges += transaction.amount
                elif transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    total_payments += transaction.amount
            
            print("\n📊 ΣΥΝΟΛΑ ΜΑΡΤΙΟΥ 2025:")
            print(f"   • Συνολικές χρεώσεις: {total_charges}€")
            print(f"   • Συνολικές πληρωμές: {total_payments}€")
            print(f"   • Καθαρό υπόλοιπο: {total_payments - total_charges}€")
        else:
            print("❌ Δεν βρέθηκαν συναλλαγές για τον Μάρτιο 2025")
        
        print("\n" + "=" * 60)
        
        # 3. Έλεγχος δαπανών Μαρτίου 2025
        print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΜΑΡΤΙΟΥ 2025")
        
        march_expenses = Expense.objects.filter(
            building_id=building.id,
            date__year=2025,
            date__month=3
        ).order_by('date', 'id')
        
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ ΜΑΡΤΙΟΥ 2025: {march_expenses.count()}")
        
        if march_expenses.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΑΠΑΝΩΝ:")
            
            total_expenses = Decimal('0.00')
            for i, expense in enumerate(march_expenses, 1):
                print(f"\n   {i}. {expense.date} - {expense.title}")
                print(f"      Ποσό: {expense.amount}€")
                print(f"      Τύπος κατανομής: {expense.distribution_type}")
                print(f"      Κατηγορία: {expense.category or 'N/A'}")
                
                total_expenses += expense.amount
            
            print(f"\n📊 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ ΜΑΡΤΙΟΥ 2025: {total_expenses}€")
        else:
            print("❌ Δεν βρέθηκαν δαπάνες για τον Μάρτιο 2025")
        
        print("\n" + "=" * 60)
        
        # 4. Έλεγχος πληρωμών Μαρτίου 2025
        print("🔍 ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ ΜΑΡΤΙΟΥ 2025")
        
        march_payments = Payment.objects.filter(
            apartment__building_id=building.id,
            date__year=2025,
            date__month=3
        ).order_by('date', 'id')
        
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ ΜΑΡΤΙΟΥ 2025: {march_payments.count()}")
        
        if march_payments.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΛΗΡΩΜΩΝ:")
            
            total_payments = Decimal('0.00')
            for i, payment in enumerate(march_payments, 1):
                print(f"\n   {i}. {payment.date} - {payment.apartment.number}")
                print(f"      Ποσό: {payment.amount}€")
                print(f"      Μέθοδος: {payment.get_method_display()}")
                print(f"      Πληρωτής: {payment.payer_name or 'N/A'}")
                
                total_payments += payment.amount
            
            print(f"\n📊 ΣΥΝΟΛΟ ΠΛΗΡΩΜΩΝ ΜΑΡΤΙΟΥ 2025: {total_payments}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές για τον Μάρτιο 2025")
        
        print("\n" + "=" * 60)
        
        # 5. Έλεγχος ιστορικού υπολοίπου μέχρι τέλος Μαρτίου 2025
        print("🔍 ΙΣΤΟΡΙΚΟ ΥΠΟΛΟΙΠΟ ΜΕΧΡΙ ΤΕΛΟΣ ΜΑΡΤΙΟΥ 2025")
        
        march_end_date = timezone.make_aware(datetime(2025, 3, 31, 23, 59, 59))
        
        apartments = Apartment.objects.filter(building_id=building.id)
        total_historical_balance = Decimal('0.00')
        
        for apartment in apartments:
            # Υπολογισμός πληρωμών μέχρι τέλος Μαρτίου
            total_payments = Payment.objects.filter(
                apartment=apartment,
                date__lte=march_end_date
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός χρεώσεων μέχρι τέλος Μαρτίου
            total_charges = Transaction.objects.filter(
                apartment=apartment,
                date__lte=march_end_date,
                type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                         'interest_charge', 'penalty_charge']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός επιπλέον εισπράξεων
            additional_payments = Transaction.objects.filter(
                apartment=apartment,
                date__lte=march_end_date,
                type__in=['common_expense_payment', 'payment_received', 'refund']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            historical_balance = total_payments + additional_payments - total_charges
            total_historical_balance += historical_balance
            
            print(f"\n🏠 Διαμέρισμα {apartment.number}:")
            print(f"   • Πληρωμές: {total_payments}€")
            print(f"   • Χρεώσεις: {total_charges}€")
            print(f"   • Επιπλέον εισπράξεις: {additional_payments}€")
            print(f"   • Ιστορικό υπόλοιπο: {historical_balance}€")
        
        print(f"\n📊 ΣΥΝΟΛΙΚΟ ΙΣΤΟΡΙΚΟ ΥΠΟΛΟΙΠΟ (31/03/2025): {total_historical_balance}€")
        
        # Έλεγχος αν το υπόλοιπο είναι αρνητικό (οφειλές)
        if total_historical_balance < 0:
            print(f"📊 ΣΥΝΟΛΙΚΕΣ ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ: {abs(total_historical_balance)}€")
        else:
            print("📊 Δεν υπάρχουν παλαιότερες οφειλές")

if __name__ == "__main__":
    check_march_2025_transactions()
