#!/usr/bin/env python3
"""
Script to trace the source of 187.00 € amount in building management system
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
from django.db.models import Sum, Q

def trace_187_amount():
    """Trace the source of 187.00 € amount"""
    
    print("🔍 ΕΝΤΟΠΙΣΜΟΣ ΠΟΣΟΥ 187.00€")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get building (Αλκμάνος 22)
        building = Building.objects.get(id=4)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # 1. Check building current_reserve
        print("1️⃣ ΕΛΕΓΧΟΣ ΤΡΕΧΟΝΤΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΚΤΙΡΙΟΥ:")
        print(f"   Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
        print()
        
        # 2. Calculate total payments
        print("2️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΩΝ ΕΙΣΠΡΑΞΕΩΝ:")
        payments = Payment.objects.filter(apartment__building=building)
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"   Συνολικές εισπράξεις: {total_payments}€")
        
        # Show payment details
        print("   Λεπτομέρειες εισπράξεων:")
        for payment in payments.order_by('date'):
            print(f"     {payment.date.strftime('%d/%m/%Y')}: {payment.apartment.number} - {payment.amount}€ ({payment.payment_type})")
        print()
        
        # 3. Calculate total expenses
        print("3️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΩΝ ΔΑΠΑΝΩΝ:")
        expenses = Expense.objects.filter(building=building)
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"   Συνολικές δαπάνες: {total_expenses}€")
        
        # Show expense details
        print("   Λεπτομέρειες δαπανών:")
        for expense in expenses.order_by('date'):
            print(f"     {expense.date.strftime('%d/%m/%Y')}: {expense.title} - {expense.amount}€ ({expense.category})")
        print()
        
        # 4. Calculate reserve from payments - expenses
        calculated_reserve = total_payments - total_expenses
        print("4️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"   Εισπράξεις - Δαπάνες = {total_payments}€ - {total_expenses}€ = {calculated_reserve}€")
        print()
        
        # 5. Check if 187.00 matches any calculation
        target_amount = Decimal('187.00')
        print("5️⃣ ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ 187.00€:")
        print("-" * 40)
        
        if abs(calculated_reserve - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το υπολογισμένο αποθεματικό!")
            print(f"   Πηγή: Εισπράξεις ({total_payments}€) - Δαπάνες ({total_expenses}€)")
        elif abs(total_payments - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το σύνολο εισπράξεων!")
        elif abs(total_expenses - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το σύνολο δαπανών!")
        else:
            print(f"❓ Το 187.00€ δεν ταιριάζει με κανέναν υπολογισμό:")
            print(f"   - Υπολογισμένο αποθεματικό: {calculated_reserve}€")
            print(f"   - Συνολικές εισπράξεις: {total_payments}€")
            print(f"   - Συνολικές δαπάνες: {total_expenses}€")
        print()
        
        # 6. Check apartment balances
        print("6️⃣ ΕΛΕΓΧΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        apartments = Apartment.objects.filter(building=building)
        total_apartment_balance = Decimal('0.00')
        
        for apartment in apartments:
            apartment_balance = apartment.current_balance or Decimal('0.00')
            total_apartment_balance += apartment_balance
            print(f"   Διαμέρισμα {apartment.number}: {apartment_balance}€")
        
        print(f"   Σύνολο υπολοίπων διαμερισμάτων: {total_apartment_balance}€")
        
        if abs(total_apartment_balance - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το σύνολο υπολοίπων διαμερισμάτων!")
        print()
        
        # 7. Check transactions
        print("7️⃣ ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ:")
        transactions = Transaction.objects.filter(apartment__building=building).order_by('date')
        print(f"   Συνολικές συναλλαγές: {transactions.count()}")
        
        # Check if any transaction is exactly 187.00
        for transaction in transactions:
            if abs(transaction.amount - target_amount) < Decimal('0.01'):
                print(f"✅ Βρέθηκε συναλλαγή 187.00€:")
                print(f"     Ημερομηνία: {transaction.date.strftime('%d/%m/%Y')}")
                print(f"     Διαμέρισμα: {transaction.apartment.number}")
                print(f"     Τύπος: {transaction.type}")
                print(f"     Περιγραφή: {transaction.description}")
        print()
        
        # 8. Check management fees
        print("8️⃣ ΕΛΕΓΧΟΣ ΔΙΑΧΕΙΡΙΣΤΙΚΩΝ ΤΕΛΩΝ:")
        management_fee_per_apartment = building.management_fee_per_apartment or Decimal('0.00')
        apartments_count = apartments.count()
        total_management_cost = management_fee_per_apartment * apartments_count
        
        print(f"   Διαχειριστικό τέλος ανά διαμέρισμα: {management_fee_per_apartment}€")
        print(f"   Αριθμός διαμερισμάτων: {apartments_count}")
        print(f"   Συνολικό διαχειριστικό κόστος: {total_management_cost}€")
        
        if abs(total_management_cost - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το συνολικό διαχειριστικό κόστος!")
        print()
        
        # 9. Check reserve fund contributions
        print("9️⃣ ΕΛΕΓΧΟΣ ΕΙΣΦΟΡΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        reserve_contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
        total_reserve_contributions = reserve_contribution_per_apartment * apartments_count
        
        print(f"   Εισφορά αποθεματικού ανά διαμέρισμα: {reserve_contribution_per_apartment}€")
        print(f"   Συνολικές εισφοράς αποθεματικού: {total_reserve_contributions}€")
        
        if abs(total_reserve_contributions - target_amount) < Decimal('0.01'):
            print(f"✅ Το 187.00€ είναι το σύνολο εισφορών αποθεματικού!")
        print()
        
        # 10. Summary
        print("🔍 ΣΥΝΟΠΤΙΚΗ ΑΝΑΛΥΣΗ:")
        print("=" * 60)
        print(f"🎯 Ποσό προς εντοπισμό: {target_amount}€")
        print()
        print("📊 Διαθέσιμα ποσά:")
        print(f"   - Υπολογισμένο αποθεματικό: {calculated_reserve}€")
        print(f"   - Συνολικές εισπράξεις: {total_payments}€")
        print(f"   - Συνολικές δαπάνες: {total_expenses}€")
        print(f"   - Υπόλοιπα διαμερισμάτων: {total_apartment_balance}€")
        print(f"   - Διαχειριστικό κόστος: {total_management_cost}€")
        print(f"   - Εισφοράς αποθεματικού: {total_reserve_contributions}€")
        print()
        
        # Check for any combination that might equal 187.00
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΔΥΑΣΜΩΝ:")
        combinations = [
            ("Εισπράξεις - Δαπάνες", calculated_reserve),
            ("Συνολικές εισπράξεις", total_payments),
            ("Συνολικές δαπάνες", total_expenses),
            ("Υπόλοιπα διαμερισμάτων", total_apartment_balance),
            ("Διαχειριστικό κόστος", total_management_cost),
            ("Εισφοράς αποθεματικού", total_reserve_contributions),
        ]
        
        found_match = False
        for name, amount in combinations:
            if abs(amount - target_amount) < Decimal('0.01'):
                print(f"✅ Βρέθηκε αντιστοίχιση: {name} = {amount}€")
                found_match = True
        
        if not found_match:
            print("❌ Δεν βρέθηκε ακριβής αντιστοίχιση για το 187.00€")
            print("💡 Πιθανές αιτίες:")
            print("   - Το ποσό μπορεί να είναι αποτέλεσμα υπολογισμού")
            print("   - Μπορεί να είναι από άλλη πηγή δεδομένων")
            print("   - Μπορεί να είναι από snapshot ή προβολή συγκεκριμένου μήνα")

if __name__ == "__main__":
    trace_187_amount()
