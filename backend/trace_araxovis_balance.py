#!/usr/bin/env python3
"""
🔍 Trace Αραχώβης 12 Balance - 7,712.68€ Analysis
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from django.db.models import Sum, Q

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense, Transaction, Supplier

def trace_araxovis_balance():
    """Trace the source of 7,712.68€ balance for Αραχώβης 12"""
    
    print("🔍 ΕΝΤΟΠΙΣΜΟΣ ΠΗΓΗΣ ΥΠΟΛΟΙΠΟΥ ΑΡΑΧΩΒΗΣ 12")
    print("=" * 80)
    print("🎯 Στόχος: Εύρεση πηγής του ποσού 7.712,68€")
    print()
    
    with schema_context('demo'):
        # 1. Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αραχώβης!")
            return False
        
        print(f"✅ Κτίριο βρέθηκε: {building.name}")
        print(f"   ID: {building.id}")
        print(f"   Διεύθυνση: {building.address}")
        print(f"   Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
        print()
        
        # 2. Έλεγχος διαμερισμάτων και υπολοίπων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Διαμερίσματα ({apartments.count()}):")
        print("-" * 60)
        
        total_apartment_balance = Decimal('0.00')
        for apt in apartments:
            balance = apt.current_balance or Decimal('0.00')
            total_apartment_balance += balance
            status = "Πιστωτικό" if balance > 0 else "Χρεωστικό" if balance < 0 else "Μηδέν"
            print(f"   {apt.number}: {apt.owner_name} - Υπόλοιπο: {balance}€ ({status})")
        
        print(f"\n📊 Σύνολο υπολοίπων διαμερισμάτων: {total_apartment_balance}€")
        print()
        
        # 3. Ανάλυση εισπράξεων
        payments = Payment.objects.filter(apartment__building=building).order_by('date')
        print(f"💰 Εισπράξεις ({payments.count()}):")
        print("-" * 60)
        
        total_payments = Decimal('0.00')
        for payment in payments:
            total_payments += payment.amount
            print(f"   {payment.date.strftime('%d/%m/%Y')}: {payment.apartment.number} - {payment.amount}€ ({payment.method})")
        
        print(f"\n📊 Σύνολο εισπράξεων: {total_payments}€")
        print()
        
        # 4. Ανάλυση δαπανών
        expenses = Expense.objects.filter(building=building).order_by('date')
        print(f"💸 Δαπάνες ({expenses.count()}):")
        print("-" * 60)
        
        total_expenses = Decimal('0.00')
        for expense in expenses:
            total_expenses += expense.amount
            print(f"   {expense.date.strftime('%d/%m/%Y')}: {expense.title} - {expense.amount}€ ({expense.category})")
        
        print(f"\n📊 Σύνολο δαπανών: {total_expenses}€")
        print()
        
        # 5. Ανάλυση συναλλαγών
        transactions = Transaction.objects.filter(apartment__building=building).order_by('date')
        print(f"🔄 Συναλλαγές ({transactions.count()}):")
        print("-" * 60)
        
        for transaction in transactions:
            trans_type = "Είσπραξη" if transaction.amount > 0 else "Δαπάνη"
            print(f"   {transaction.date.strftime('%d/%m/%Y')}: {transaction.apartment.number} - {transaction.amount}€ ({trans_type})")
        
        print()
        
        # 6. Υπολογισμός και ανάλυση
        print("=" * 80)
        print("📈 ΑΝΑΛΥΣΗ ΥΠΟΛΟΓΙΣΜΟΥ:")
        print("=" * 80)
        
        # Υπολογισμός αποθεματικού: Εισπράξεις - Δαπάνες
        calculated_reserve = total_payments - total_expenses
        print(f"💰 Υπολογισμένο αποθεματικό: {total_payments}€ - {total_expenses}€ = {calculated_reserve}€")
        print(f"💰 Αποθεματικό στη βάση: {building.current_reserve}€")
        
        if building.current_reserve != calculated_reserve:
            print(f"⚠️  ΔΙΑΦΟΡΑ: {building.current_reserve}€ vs {calculated_reserve}€")
        else:
            print(f"✅ Τα αποθεματικά ταιριάζουν!")
        
        print()
        
        # 7. Έλεγχος για το 7,712.68€
        target_amount = Decimal('7712.68')
        print(f"🎯 ΕΝΤΟΠΙΣΜΟΣ ΠΟΣΟΥ {target_amount}€:")
        print("-" * 60)
        
        # Έλεγχος αν το ποσό είναι το αποθεματικό
        if abs(building.current_reserve - target_amount) < Decimal('0.01'):
            print(f"✅ Το ποσό {target_amount}€ είναι το τρέχον αποθεματικό του κτιρίου!")
            print(f"   Πηγή: Εισπράξεις ({total_payments}€) - Δαπάνες ({total_expenses}€)")
        
        # Έλεγχος αν το ποσό είναι το σύνολο εισπράξεων
        elif abs(total_payments - target_amount) < Decimal('0.01'):
            print(f"✅ Το ποσό {target_amount}€ είναι το σύνολο εισπράξεων!")
        
        # Έλεγχος αν το ποσό είναι το σύνολο δαπανών
        elif abs(total_expenses - target_amount) < Decimal('0.01'):
            print(f"✅ Το ποσό {target_amount}€ είναι το σύνολο δαπανών!")
        
        # Έλεγχος αν το ποσό είναι το σύνολο υπολοίπων διαμερισμάτων
        elif abs(total_apartment_balance - target_amount) < Decimal('0.01'):
            print(f"✅ Το ποσό {target_amount}€ είναι το σύνολο υπολοίπων διαμερισμάτων!")
        
        else:
            print(f"❓ Το ποσό {target_amount}€ δεν ταιριάζει με κανέναν υπολογισμό:")
            print(f"   - Αποθεματικό: {building.current_reserve}€")
            print(f"   - Εισπράξεις: {total_payments}€")
            print(f"   - Δαπάνες: {total_expenses}€")
            print(f"   - Υπόλοιπα διαμερισμάτων: {total_apartment_balance}€")
        
        print()
        
        # 8. Ανάλυση ανά μήνα
        print("📅 ΑΝΑΛΥΣΗ ΑΝΑ ΜΗΝΑ:")
        print("-" * 60)
        
        # Ομαδοποίηση εισπράξεων ανά μήνα
        monthly_payments = {}
        for payment in payments:
            month_key = f"{payment.date.year}-{payment.date.month:02d}"
            if month_key not in monthly_payments:
                monthly_payments[month_key] = Decimal('0.00')
            monthly_payments[month_key] += payment.amount
        
        # Ομαδοποίηση δαπανών ανά μήνα
        monthly_expenses = {}
        for expense in expenses:
            month_key = f"{expense.date.year}-{expense.date.month:02d}"
            if month_key not in monthly_expenses:
                monthly_expenses[month_key] = Decimal('0.00')
            monthly_expenses[month_key] += expense.amount
        
        # Εμφάνιση ανά μήνα
        all_months = sorted(set(list(monthly_payments.keys()) + list(monthly_expenses.keys())))
        
        for month in all_months:
            payments_month = monthly_payments.get(month, Decimal('0.00'))
            expenses_month = monthly_expenses.get(month, Decimal('0.00'))
            balance_month = payments_month - expenses_month
            
            print(f"   {month}: Εισπράξεις {payments_month}€ - Δαπάνες {expenses_month}€ = Υπόλοιπο {balance_month}€")
        
        print()
        
        # 9. Συμπέρασμα
        print("=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        
        if abs(building.current_reserve - target_amount) < Decimal('0.01'):
            print(f"✅ Το ποσό 7.712,68€ είναι το τρέχον αποθεματικό του κτιρίου Αραχώβης 12.")
            print(f"   Υπολογίζεται ως: Εισπράξεις ({total_payments}€) - Δαπάνες ({total_expenses}€)")
            print(f"   Αυτό σημαίνει ότι το κτίριο έχει συνολικά εισπράξει {total_payments}€ και έχει δαπανήσει {total_expenses}€.")
            print(f"   Η διαφορά αποτελεί το διαθέσιμο αποθεματικό για μελλοντικές δαπάνες.")
        else:
            print(f"❓ Το ποσό 7.712,68€ δεν ταιριάζει ακριβώς με κανέναν υπολογισμό.")
            print(f"   Πιθανές πηγές:")
            print(f"   - Τρέχον αποθεματικό: {building.current_reserve}€")
            print(f"   - Συνολικές εισπράξεις: {total_payments}€")
            print(f"   - Συνολικές δαπάνες: {total_expenses}€")
            print(f"   - Υπόλοιπα διαμερισμάτων: {total_apartment_balance}€")
        
        return True

if __name__ == "__main__":
    trace_araxovis_balance()
