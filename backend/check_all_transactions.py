#!/usr/bin/env python3
"""
Έλεγχος όλων των συναλλαγών του κτιρίου Αλκμάνος 22
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
from datetime import date, datetime
from django.utils import timezone

def check_all_transactions():
    """Έλεγχος όλων των συναλλαγών"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ")
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
        
        # 2. Όλες οι συναλλαγές
        all_transactions = Transaction.objects.filter(
            building_id=building.id
        ).order_by('date', 'id')
        
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΣΥΝΑΛΛΑΓΕΣ: {all_transactions.count()}")
        
        if all_transactions.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΣΥΝΑΛΛΑΓΩΝ:")
            
            total_charges = Decimal('0.00')
            total_payments = Decimal('0.00')
            
            for i, transaction in enumerate(all_transactions, 1):
                print(f"\n   {i}. {transaction.date.date()} - {transaction.type}")
                print(f"      Διαμέρισμα: {transaction.apartment.number if transaction.apartment else 'N/A'}")
                print(f"      Ποσό: {transaction.amount}€")
                print(f"      Περιγραφή: {transaction.description or 'N/A'}")
                
                if transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                      'interest_charge', 'penalty_charge']:
                    total_charges += transaction.amount
                elif transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    total_payments += transaction.amount
            
            print(f"\n📊 ΣΥΝΟΛΑ:")
            print(f"   • Συνολικές χρεώσεις: {total_charges}€")
            print(f"   • Συνολικές πληρωμές: {total_payments}€")
            print(f"   • Καθαρό υπόλοιπο: {total_payments - total_charges}€")
        else:
            print("❌ Δεν βρέθηκαν συναλλαγές")
        
        print("\n" + "=" * 60)
        
        # 3. Όλες οι δαπάνες
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ")
        
        all_expenses = Expense.objects.filter(
            building_id=building.id
        ).order_by('date', 'id')
        
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ: {all_expenses.count()}")
        
        if all_expenses.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΑΠΑΝΩΝ:")
            
            total_expenses = Decimal('0.00')
            for i, expense in enumerate(all_expenses, 1):
                print(f"\n   {i}. {expense.date} - {expense.title}")
                print(f"      Ποσό: {expense.amount}€")
                print(f"      Τύπος κατανομής: {expense.distribution_type}")
                print(f"      Κατηγορία: {expense.category or 'N/A'}")
                print(f"      Εκδοθείσα: {getattr(expense, 'is_issued', 'N/A')}")
                
                total_expenses += expense.amount
            
            print(f"\n📊 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {total_expenses}€")
        else:
            print("❌ Δεν βρέθηκαν δαπάνες")
        
        print("\n" + "=" * 60)
        
        # 4. Όλες οι πληρωμές
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΠΛΗΡΩΜΩΝ")
        
        all_payments = Payment.objects.filter(
            apartment__building_id=building.id
        ).order_by('date', 'id')
        
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ: {all_payments.count()}")
        
        if all_payments.exists():
            print("\n📜 ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΛΗΡΩΜΩΝ:")
            
            total_payments = Decimal('0.00')
            for i, payment in enumerate(all_payments, 1):
                print(f"\n   {i}. {payment.date} - {payment.apartment.number}")
                print(f"      Ποσό: {payment.amount}€")
                print(f"      Μέθοδος: {payment.get_method_display()}")
                print(f"      Πληρωτής: {payment.payer_name or 'N/A'}")
                
                total_payments += payment.amount
            
            print(f"\n📊 ΣΥΝΟΛΟ ΠΛΗΡΩΜΩΝ: {total_payments}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές")
        
        print("\n" + "=" * 60)
        
        # 5. Έλεγχος τρεχόντων υπολοίπων διαμερισμάτων
        print("🔍 ΤΡΕΧΟΝΤΑ ΥΠΟΛΟΙΠΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        
        apartments = Apartment.objects.filter(building_id=building.id)
        
        for apartment in apartments:
            current_balance = apartment.current_balance or Decimal('0.00')
            print(f"\n🏠 Διαμέρισμα {apartment.number}:")
            print(f"   • Τρέχον υπόλοιπο: {current_balance}€")
            print(f"   • Ιδιοκτήτης: {apartment.owner_name or 'N/A'}")
        
        print("\n" + "=" * 60)
        print("🎯 ΣΥΜΠΕΡΑΣΜΑ")
        print("Ελέγχθηκε η πλήρης κατάσταση του κτιρίου")

if __name__ == "__main__":
    check_all_transactions()
