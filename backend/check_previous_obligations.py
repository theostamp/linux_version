#!/usr/bin/env python3
"""
Script για έλεγχο παλαιότερων οφειλών
Ελέγχει:
1. Δαπάνες από προηγούμενους μήνες
2. Μηνιαία υπόλοιπα
3. Παλαιότερες οφειλές
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

def check_previous_months_expenses():
    """Ελέγχει τις δαπάνες από προηγούμενους μήνες"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΠΡΟΗΓΟΥΜΕΝΩΝ ΜΗΝΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Δαπάνες από Ιανουάριο 2025 μέχρι Σεπτέμβριο 2025
        previous_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month__lte=9
        ).order_by('date')
        
        print(f"\n📋 Δαπάνες προηγούμενων μηνών (Ιαν-Σεπ 2025): {previous_expenses.count()}")
        
        total_by_month = {}
        total_all = Decimal('0.00')
        
        for expense in previous_expenses:
            month_key = f"{expense.date.year}-{expense.date.month:02d}"
            if month_key not in total_by_month:
                total_by_month[month_key] = Decimal('0.00')
            
            total_by_month[month_key] += expense.amount
            total_all += expense.amount
            
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   🏷️ Τύπος: {expense.expense_type}")
            print(f"   📂 Κατηγορία: {expense.category}")
        
        print(f"\n📊 ΣΥΝΟΛΑ ΑΝΑ ΜΗΝΑ:")
        for month, amount in sorted(total_by_month.items()):
            print(f"   {month}: {format_currency(amount)}")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ ΠΡΟΗΓΟΥΜΕΝΩΝ ΜΗΝΩΝ: {format_currency(total_all)}")
        return total_all

def check_monthly_balances():
    """Ελέγχει τα μηνιαία υπόλοιπα"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΜΗΝΙΑΙΩΝ ΥΠΟΛΟΙΠΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Μηνιαία υπόλοιπα για 2025
        monthly_balances = MonthlyBalance.objects.filter(
            building=building,
            year=2025
        ).order_by('month')
        
        print(f"\n📋 Μηνιαία υπόλοιπα 2025: {monthly_balances.count()}")
        
        total_carry_forward = Decimal('0.00')
        
        for balance in monthly_balances:
            print(f"\n📅 {balance.month:02d}/{balance.year}")
            print(f"   💰 Συνολικές δαπάνες: {format_currency(balance.total_expenses)}")
            print(f"   💰 Συνολικές εισπράξεις: {format_currency(balance.total_payments)}")
            print(f"   💰 Παλιές οφειλές: {format_currency(balance.previous_obligations)}")
            print(f"   💰 Αποθεματικό: {format_currency(balance.reserve_fund_amount)}")
            print(f"   💰 Διαχειριστικά έξοδα: {format_currency(balance.management_fees)}")
            print(f"   💰 Μεταφορά: {format_currency(balance.carry_forward)}")
            print(f"   🏷️ Κλειστός μήνας: {'Ναι' if balance.is_closed else 'Όχι'}")
            
            total_carry_forward += balance.carry_forward
        
        print(f"\n💰 ΣΥΝΟΛΟ ΜΕΤΑΦΟΡΩΝ: {format_currency(total_carry_forward)}")
        return total_carry_forward

def check_apartment_balances():
    """Ελέγχει τα υπόλοιπα διαμερισμάτων"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        print(f"\n🏠 Διαμερίσματα: {apartments.count()}")
        
        total_balances = Decimal('0.00')
        positive_balances = Decimal('0.00')
        negative_balances = Decimal('0.00')
        
        for apartment in apartments:
            current_balance = apartment.current_balance or Decimal('0.00')
            total_balances += current_balance
            
            if current_balance > 0:
                positive_balances += current_balance
            elif current_balance < 0:
                negative_balances += current_balance
            
            if current_balance != 0:
                print(f"\n🏠 {apartment.number}")
                print(f"   💰 Υπόλοιπο: {format_currency(current_balance)}")
                print(f"   📊 Χιλιοστά: {apartment.participation_mills}")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΥΠΟΛΟΙΠΩΝ: {format_currency(total_balances)}")
        print(f"💰 ΘΕΤΙΚΑ ΥΠΟΛΟΙΠΑ: {format_currency(positive_balances)}")
        print(f"💰 ΑΡΝΗΤΙΚΑ ΥΠΟΛΟΙΠΑ: {format_currency(negative_balances)}")
        
        return {
            'total': total_balances,
            'positive': positive_balances,
            'negative': negative_balances
        }

def check_transactions_summary():
    """Ελέγχει σύνοψη συναλλαγών"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΟΨΗΣ ΣΥΝΑΛΛΑΓΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Όλες οι συναλλαγές για 2025
        all_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025
        )
        
        print(f"\n📋 Συνολικές συναλλαγές 2025: {all_transactions.count()}")
        
        total_by_type = {}
        total_amount = Decimal('0.00')
        
        for transaction in all_transactions:
            transaction_type = transaction.type
            if transaction_type not in total_by_type:
                total_by_type[transaction_type] = Decimal('0.00')
            
            total_by_type[transaction_type] += transaction.amount
            total_amount += transaction.amount
        
        print(f"\n📊 ΣΥΝΟΛΑ ΑΝΑ ΤΥΠΟ ΣΥΝΑΛΛΑΓΗΣ:")
        for transaction_type, amount in total_by_type.items():
            print(f"   {transaction_type}: {format_currency(amount)}")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΣΥΝΑΛΛΑΓΩΝ: {format_currency(total_amount)}")
        return total_amount

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ")
    print("=" * 80)
    
    try:
        # 1. Έλεγχος δαπανών προηγούμενων μηνών
        previous_expenses = check_previous_months_expenses()
        
        # 2. Έλεγχος μηνιαίων υπολοίπων
        monthly_carry_forward = check_monthly_balances()
        
        # 3. Έλεγχος υπολοίπων διαμερισμάτων
        apartment_balances = check_apartment_balances()
        
        # 4. Έλεγχος σύνοψης συναλλαγών
        total_transactions = check_transactions_summary()
        
        # Συνοπτικά αποτελέσματα
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)
        print(f"💰 Δαπάνες προηγούμενων μηνών: {format_currency(previous_expenses)}")
        print(f"💰 Μηνιαίες μεταφορές: {format_currency(monthly_carry_forward)}")
        print(f"💰 Συνολικά υπόλοιπα διαμερισμάτων: {format_currency(apartment_balances['total'])}")
        print(f"💰 Συνολικές συναλλαγές: {format_currency(total_transactions)}")
        
        # Ανάλυση για την εύρεση της διαφοράς
        dashboard_total = Decimal('2000.01')
        known_expenses = Decimal('1331.99')  # Οκτώβριος + Σεπτέμβριος
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΓΙΑ ΕΥΡΕΣΗ ΔΙΑΦΟΡΑΣ:")
        print(f"   Dashboard εμφανίζει: {format_currency(dashboard_total)}")
        print(f"   Γνωστές δαπάνες: {format_currency(known_expenses)}")
        print(f"   Διαφορά: {format_currency(dashboard_total - known_expenses)}")
        
        # Προτάσεις
        print(f"\n💡 ΠΡΟΤΑΣΕΙΣ:")
        print(f"   1. Ελέγξτε αν υπάρχουν διαχειριστικά έξοδα που δεν εμφανίζονται")
        print(f"   2. Ελέγξτε αν υπάρχει αποθεματικό ταμείο που δεν εμφανίζεται")
        print(f"   3. Ελέγξτε αν υπάρχουν παλαιότερες οφειλές από προηγούμενους μήνες")
        print(f"   4. Ελέγξτε αν υπάρχουν άλλες δαπάνες που δεν εμφανίζονται")
        
        # Ειδική έρευνα για διαχειριστικά έξοδα
        print(f"\n🔍 ΕΙΔΙΚΗ ΕΡΕΥΝΑ:")
        print(f"   Η διαφορά των 668.02€ μπορεί να προέρχεται από:")
        print(f"   - Διαχειριστικά έξοδα (π.χ. 10 διαμ. × 66.80€ = 668€)")
        print(f"   - Αποθεματικό ταμείο")
        print(f"   - Παλαιότερες οφειλές")
        print(f"   - Άλλες δαπάνες που δεν εμφανίζονται στο σύστημα")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
