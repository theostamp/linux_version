#!/usr/bin/env python3
"""
Script to debug why the AmountDetailsModal is not showing transaction data
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from django.db.models import Sum

def debug_modal_data():
    """Debug why modal is not showing transaction data"""
    
    print("🔍 DEBUG: Modal Transaction Data")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get building (Αθηνών 12 - ID 1)
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve}€")
        print()
        
        # 1. Check if there are any transactions for this building
        print("1️⃣ ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 40)
        
        transactions = Transaction.objects.filter(apartment__building=building)
        print(f"Συνολικές συναλλαγές: {transactions.count()}")
        
        if transactions.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΣΥΝΑΛΛΑΓΕΣ!")
            print("💡 Αυτό εξηγεί γιατί το modal δεν εμφανίζει δεδομένα")
        else:
            print("✅ Υπάρχουν συναλλαγές")
            for transaction in transactions.order_by('-date')[:5]:
                print(f"   {transaction.date}: {transaction.apartment.number} - {transaction.amount}€ ({transaction.type})")
        print()
        
        # 2. Check payments
        print("2️⃣ ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ:")
        print("-" * 40)
        
        payments = Payment.objects.filter(apartment__building=building)
        print(f"Συνολικές πληρωμές: {payments.count()}")
        
        if payments.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΠΛΗΡΩΜΕΣ!")
        else:
            print("✅ Υπάρχουν πληρωμές")
            for payment in payments.order_by('-date')[:5]:
                print(f"   {payment.date}: {payment.apartment.number} - {payment.amount}€ ({payment.payment_type})")
        print()
        
        # 3. Check expenses
        print("3️⃣ ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ:")
        print("-" * 40)
        
        expenses = Expense.objects.filter(building=building)
        print(f"Συνολικές δαπάνες: {expenses.count()}")
        
        if expenses.count() == 0:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΔΑΠΑΝΕΣ!")
        else:
            print("✅ Υπάρχουν δαπάνες")
            for expense in expenses.order_by('-date')[:5]:
                print(f"   {expense.date}: {expense.title} - {expense.amount}€ ({expense.category})")
        print()
        
        # 4. Check apartments
        print("4️⃣ ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building=building)
        print(f"Συνολικά διαμερίσματα: {apartments.count()}")
        
        for apartment in apartments:
            print(f"   Διαμέρισμα {apartment.number}: Υπόλοιπο {apartment.current_balance}€")
        print()
        
        # 5. Calculate how 187.00€ is derived
        print("5️⃣ ΥΠΟΛΟΓΙΣΜΟΣ 187.00€:")
        print("-" * 40)
        
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        calculated_reserve = total_payments - total_expenses
        
        print(f"Συνολικές πληρωμές: {total_payments}€")
        print(f"Συνολικές δαπάνες: {total_expenses}€")
        print(f"Υπολογισμένο αποθεματικό: {calculated_reserve}€")
        print(f"Αποθεματικό στη βάση: {building.current_reserve}€")
        
        if abs(calculated_reserve - Decimal('187.00')) < Decimal('0.01'):
            print("✅ Το 187.00€ προκύπτει από: Εισπράξεις - Δαπάνες")
        else:
            print("❓ Το 187.00€ δεν προκύπτει από αυτόν τον υπολογισμό")
        
        print()
        
        # 6. Check if there are transactions in other buildings
        print("6️⃣ ΕΛΕΓΧΟΣ ΑΛΛΩΝ ΚΤΙΡΙΩΝ:")
        print("-" * 40)
        
        all_buildings = Building.objects.all()
        for b in all_buildings:
            b_transactions = Transaction.objects.filter(apartment__building=b).count()
            b_payments = Payment.objects.filter(apartment__building=b).count()
            b_expenses = Expense.objects.filter(building=b).count()
            
            print(f"Κτίριο {b.id} ({b.name}):")
            print(f"   Συναλλαγές: {b_transactions}")
            print(f"   Πληρωμές: {b_payments}")
            print(f"   Δαπάνες: {b_expenses}")
            print()

if __name__ == "__main__":
    debug_modal_data()
