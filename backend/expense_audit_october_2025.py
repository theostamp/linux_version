#!/usr/bin/env python3
"""
Script για πλήρη έλεγχο των δαπανών Οκτωβρίου 2025
Ελέγχει:
1. Δαπάνες Οκτωβρίου 2025
2. Απλήρωτες δαπάνες Σεπτεμβρίου
3. Υπολογισμό οικονομικών υποχρεώσεων
4. Γιατί δεν εμφανίζονται οι Σεπτεμβριανές οφειλές
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
from financial.models import Expense, Transaction, CommonExpensePeriod
from apartments.models import Apartment
from buildings.models import Building

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_october_expenses():
    """Ελέγχει τις δαπάνες του Οκτωβρίου 2025"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΟΚΤΩΒΡΙΟΥ 2025")
    print("=" * 80)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δαπάνες Οκτωβρίου 2025
        october_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=10
        ).order_by('date')
        
        print(f"\n📋 Δαπάνες Οκτωβρίου 2025: {october_expenses.count()}")
        
        total_amount = Decimal('0.00')
        for expense in october_expenses:
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   📂 Κατηγορία: {expense.category}")
            print(f"   📝 Σημειώσεις: {expense.notes}")
            print(f"   🏷️ Τύπος: {expense.expense_type}")
            total_amount += expense.amount
        
        print(f"\n💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ ΟΚΤΩΒΡΙΟΥ: {format_currency(total_amount)}")
        return total_amount

def check_september_unpaid_expenses():
    """Ελέγχει τις απλήρωτες δαπάνες του Σεπτεμβρίου"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΑΠΛΗΡΩΤΩΝ ΔΑΠΑΝΩΝ ΣΕΠΤΕΜΒΡΙΟΥ 2025")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Δαπάνες Σεπτεμβρίου 2025
        september_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=9
        ).order_by('date')
        
        print(f"\n📋 Δαπάνες Σεπτεμβρίου 2025: {september_expenses.count()}")
        
        total_september = Decimal('0.00')
        unpaid_september = Decimal('0.00')
        
        for expense in september_expenses:
            print(f"\n📅 {expense.date.strftime('%d/%m/%Y')} - {expense.title}")
            print(f"   💰 Ποσό: {format_currency(expense.amount)}")
            print(f"   🏷️ Τύπος: {expense.expense_type}")
            
            total_september += expense.amount
            
            # Για τώρα θεωρούμε όλες τις δαπάνες ως απλήρωτες
            # (θα ελέγξουμε τις συναλλαγές για να δούμε αν έχουν πληρωθεί)
            unpaid_september += expense.amount
            print(f"   ⚠️  ΑΠΛΗΡΩΤΗ ΔΑΠΑΝΗ (προσωρινά)")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ ΣΕΠΤΕΜΒΡΙΟΥ: {format_currency(total_september)}")
        print(f"💰 ΑΠΛΗΡΩΤΕΣ ΔΑΠΑΝΕΣ ΣΕΠΤΕΜΒΡΙΟΥ: {format_currency(unpaid_september)}")
        return unpaid_september

def check_expense_transactions():
    """Ελέγχει τις συναλλαγές δαπανών"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΔΑΠΑΝΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Συναλλαγές Οκτωβρίου
        october_transactions = Transaction.objects.filter(
            building=building,
            date__year=2025,
            date__month=10
        )
        
        print(f"\n📋 Συναλλαγές Οκτωβρίου: {october_transactions.count()}")
        
        for transaction in october_transactions:
            print(f"\n🔄 Συναλλαγή ID: {transaction.id}")
            print(f"   📅 Ημερομηνία: {transaction.date}")
            print(f"   💰 Ποσό: {format_currency(transaction.amount)}")
            print(f"   🏠 Διαμέρισμα: {transaction.apartment}")
            print(f"   📝 Περιγραφή: {transaction.description}")
            print(f"   🏷️ Τύπος: {transaction.type}")

def check_common_expenses():
    """Ελέγχει τα κοινόχρηστα"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΚΟΙΝΟΧΡΗΣΤΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        
        # Κοινόχρηστα Οκτωβρίου
        october_common = CommonExpensePeriod.objects.filter(
            building=building,
            start_date__year=2025,
            start_date__month=10
        )
        
        print(f"\n📋 Κοινόχρηστα Οκτωβρίου: {october_common.count()}")
        
        for common in october_common:
            print(f"\n📅 {common.period_name}")
            print(f"   📅 Περίοδος: {common.start_date} - {common.end_date}")
            print(f"   🏷️ Κατάσταση: {'Ενεργή' if common.is_active else 'Ανενεργή'}")

def check_apartment_obligations():
    """Ελέγχει τις υποχρεώσεις διαμερισμάτων"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΧΡΕΩΣΕΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        print(f"\n🏠 Διαμερίσματα: {apartments.count()}")
        
        total_obligations = Decimal('0.00')
        
        for apartment in apartments:
            # Απλός έλεγχος υπολοίπου διαμερίσματος
            current_balance = apartment.current_balance or Decimal('0.00')
            
            if current_balance != 0:
                print(f"\n🏠 {apartment.number}")
                print(f"   💰 Τρέχον υπόλοιπο: {format_currency(current_balance)}")
                print(f"   📊 Χιλιοστά: {apartment.participation_mills}")
                
                total_obligations += abs(current_balance)
        
        print(f"\n💰 ΣΥΝΟΛΟ ΥΠΟΧΡΕΩΣΕΩΝ ΟΛΩΝ ΤΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ: {format_currency(total_obligations)}")

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΚΚΙΝΗΣΗ ΠΛΗΡΟΥΣ ΕΛΕΓΧΟΥ ΔΑΠΑΝΩΝ ΟΚΤΩΒΡΙΟΥ 2025")
    print("=" * 80)
    
    try:
        # 1. Έλεγχος δαπανών Οκτωβρίου
        october_total = check_october_expenses()
        
        # 2. Έλεγχος απλήρωτων δαπανών Σεπτεμβρίου
        september_unpaid = check_september_unpaid_expenses()
        
        # 3. Έλεγχος συναλλαγών
        check_expense_transactions()
        
        # 4. Έλεγχος κοινόχρηστων
        check_common_expenses()
        
        # 5. Έλεγχος υποχρεώσεων διαμερισμάτων
        check_apartment_obligations()
        
        # Συνοπτικά αποτελέσματα
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)
        print(f"💰 Δαπάνες Οκτωβρίου: {format_currency(october_total)}")
        print(f"💰 Απλήρωτες δαπάνες Σεπτεμβρίου: {format_currency(september_unpaid)}")
        print(f"💰 Συνολικές υποχρεώσεις: {format_currency(october_total + september_unpaid)}")
        
        # Ανάλυση διαφοράς
        dashboard_total = Decimal('2000.01')
        calculated_total = october_total + september_unpaid
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ:")
        print(f"   Dashboard εμφανίζει: {format_currency(dashboard_total)}")
        print(f"   Υπολογισμένο σύνολο: {format_currency(calculated_total)}")
        print(f"   Διαφορά: {format_currency(dashboard_total - calculated_total)}")
        
        if abs(dashboard_total - calculated_total) > Decimal('0.01'):
            print("   ⚠️  ΥΠΑΡΧΕΙ ΔΙΑΦΟΡΑ! Χρειάζεται περαιτέρω έρευνα.")
        else:
            print("   ✅ Τα ποσά ταιριάζουν!")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
