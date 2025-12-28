#!/usr/bin/env python3
"""
Script για έρευνα της διαφοράς 668.02€
Ελέγχει:
1. Διαχειριστικά έξοδα (management fees)
2. Αποθεματικό ταμείο (reserve fund)
3. Άλλες δαπάνες που μπορεί να λείπουν
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, MonthlyBalance
from apartments.models import Apartment
from buildings.models import Building

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_management_fees():
    """Ελέγχει τα διαχειριστικά έξοδα"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΙΑΧΕΙΡΙΣΤΙΚΩΝ ΕΞΟΔΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Διαχειριστικά έξοδα Οκτωβρίου
        october_management = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=10,
            expense_type='management_fee'
        )
        
        print(f"\n📋 Διαχειριστικά έξοδα Οκτωβρίου: {october_management.count()}")
        
        total_management = Decimal('0.00')
        for expense in october_management:
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   📂 Κατηγορία: {expense.category}")
            total_management += expense.amount
        
        print(f"\n💰 ΣΥΝΟΛΟ ΔΙΑΧΕΙΡΙΣΤΙΚΩΝ ΕΞΟΔΩΝ ΟΚΤΩΒΡΙΟΥ: {format_currency(total_management)}")
        return total_management

def check_reserve_fund():
    """Ελέγχει το αποθεματικό ταμείο"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Αποθεματικό ταμείο Οκτωβρίου
        october_reserve = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=10,
            expense_type='reserve_fund'
        )
        
        print(f"\n📋 Αποθεματικό ταμείο Οκτωβρίου: {october_reserve.count()}")
        
        total_reserve = Decimal('0.00')
        for expense in october_reserve:
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   📂 Κατηγορία: {expense.category}")
            total_reserve += expense.amount
        
        print(f"\n💰 ΣΥΝΟΛΟ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ ΟΚΤΩΒΡΙΟΥ: {format_currency(total_reserve)}")
        return total_reserve

def check_monthly_balance():
    """Ελέγχει το μηνιαίο υπόλοιπο"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΜΗΝΙΑΙΟΥ ΥΠΟΛΟΙΠΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Μηνιαίο υπόλοιπο Οκτωβρίου
        october_balance = MonthlyBalance.objects.filter(
            building=building,
            year=2025,
            month=10
        ).first()
        
        if october_balance:
            print(f"\n📅 Μηνιαίο υπόλοιπο Οκτωβρίου 2025:")
            print(f"   💰 Συνολικές δαπάνες: {format_currency(october_balance.total_expenses)}")
            print(f"   💰 Συνολικές εισπράξεις: {format_currency(october_balance.total_payments)}")
            print(f"   💰 Παλιές οφειλές: {format_currency(october_balance.previous_obligations)}")
            print(f"   💰 Αποθεματικό: {format_currency(october_balance.reserve_fund_amount)}")
            print(f"   💰 Διαχειριστικά έξοδα: {format_currency(october_balance.management_fees)}")
            print(f"   💰 Μεταφορά: {format_currency(october_balance.carry_forward)}")
            print(f"   🏷️ Κλειστός μήνας: {'Ναι' if october_balance.is_closed else 'Όχι'}")
            
            return {
                'total_expenses': october_balance.total_expenses,
                'total_payments': october_balance.total_payments,
                'previous_obligations': october_balance.previous_obligations,
                'reserve_fund_amount': october_balance.reserve_fund_amount,
                'management_fees': october_balance.management_fees,
                'carry_forward': october_balance.carry_forward
            }
        else:
            print("\n❌ Δεν βρέθηκε μηνιαίο υπόλοιπο για Οκτώβριο 2025")
            return None

def check_all_expenses_october():
    """Ελέγχει όλες τις δαπάνες του Οκτωβρίου"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ ΟΚΤΩΒΡΙΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Όλες οι δαπάνες Οκτωβρίου
        all_october_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=10
        ).order_by('expense_type', 'date')
        
        print(f"\n📋 Όλες οι δαπάνες Οκτωβρίου: {all_october_expenses.count()}")
        
        total_by_type = {}
        total_all = Decimal('0.00')
        
        for expense in all_october_expenses:
            expense_type = expense.expense_type
            if expense_type not in total_by_type:
                total_by_type[expense_type] = Decimal('0.00')
            
            total_by_type[expense_type] += expense.amount
            total_all += expense.amount
            
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   🏷️ Τύπος: {expense.expense_type}")
            print(f"   📂 Κατηγορία: {expense.category}")
        
        print(f"\n📊 ΣΥΝΟΛΑ ΑΝΑ ΤΥΠΟ:")
        for expense_type, amount in total_by_type.items():
            print(f"   {expense_type}: {format_currency(amount)}")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ: {format_currency(total_all)}")
        return total_all

def check_september_expenses():
    """Ελέγχει τις δαπάνες του Σεπτεμβρίου"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΣΕΠΤΕΜΒΡΙΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Όλες οι δαπάνες Σεπτεμβρίου
        all_september_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=9
        ).order_by('expense_type', 'date')
        
        print(f"\n📋 Όλες οι δαπάνες Σεπτεμβρίου: {all_september_expenses.count()}")
        
        total_by_type = {}
        total_all = Decimal('0.00')
        
        for expense in all_september_expenses:
            expense_type = expense.expense_type
            if expense_type not in total_by_type:
                total_by_type[expense_type] = Decimal('0.00')
            
            total_by_type[expense_type] += expense.amount
            total_all += expense.amount
            
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   🏷️ Τύπος: {expense.expense_type}")
            print(f"   📂 Κατηγορία: {expense.category}")
        
        print(f"\n📊 ΣΥΝΟΛΑ ΑΝΑ ΤΥΠΟ:")
        for expense_type, amount in total_by_type.items():
            print(f"   {expense_type}: {format_currency(amount)}")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ ΣΕΠΤΕΜΒΡΙΟΥ: {format_currency(total_all)}")
        return total_all

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΡΕΥΝΑ ΔΙΑΦΟΡΑΣ 668.02€")
    print("=" * 80)
    
    try:
        # 1. Έλεγχος διαχειριστικών εξόδων
        management_fees = check_management_fees()
        
        # 2. Έλεγχος αποθεματικού ταμείου
        reserve_fund = check_reserve_fund()
        
        # 3. Έλεγχος μηνιαίου υπολοίπου
        monthly_balance = check_monthly_balance()
        
        # 4. Έλεγχος όλων των δαπανών Οκτωβρίου
        all_october_expenses = check_all_expenses_october()
        
        # 5. Έλεγχος δαπανών Σεπτεμβρίου
        all_september_expenses = check_september_expenses()
        
        # Συνοπτικά αποτελέσματα
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)
        print(f"💰 Διαχειριστικά έξοδα Οκτωβρίου: {format_currency(management_fees)}")
        print(f"💰 Αποθεματικό ταμείο Οκτωβρίου: {format_currency(reserve_fund)}")
        print(f"💰 Όλες οι δαπάνες Οκτωβρίου: {format_currency(all_october_expenses)}")
        print(f"💰 Όλες οι δαπάνες Σεπτεμβρίου: {format_currency(all_september_expenses)}")
        
        # Υπολογισμός συνολικών υποχρεώσεων
        total_obligations = all_october_expenses + all_september_expenses
        print(f"\n💰 ΣΥΝΟΛΙΚΕΣ ΥΠΟΧΡΕΩΣΕΙΣ: {format_currency(total_obligations)}")
        
        # Ανάλυση διαφοράς
        dashboard_total = Decimal('2000.01')
        difference = dashboard_total - total_obligations
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ:")
        print(f"   Dashboard εμφανίζει: {format_currency(dashboard_total)}")
        print(f"   Υπολογισμένο σύνολο: {format_currency(total_obligations)}")
        print(f"   Διαφορά: {format_currency(difference)}")
        
        if abs(difference) > Decimal('0.01'):
            print(f"   ⚠️  ΥΠΑΡΧΕΙ ΔΙΑΦΟΡΑ! Χρειάζεται περαιτέρω έρευνα.")
            
            # Προτάσεις για την εύρεση της διαφοράς
            print(f"\n💡 ΠΡΟΤΑΣΕΙΣ:")
            print(f"   1. Ελέγξτε αν υπάρχουν άλλες δαπάνες που δεν εμφανίζονται")
            print(f"   2. Ελέγξτε αν υπάρχουν διαχειριστικά έξοδα που λείπουν")
            print(f"   3. Ελέγξτε αν υπάρχει αποθεματικό ταμείο που δεν εμφανίζεται")
            print(f"   4. Ελέγξτε αν υπάρχουν παλαιότερες οφειλές")
        else:
            print("   ✅ Τα ποσά ταιριάζουν!")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
