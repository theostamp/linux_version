#!/usr/bin/env python3
"""
Script για έλεγχο υπολογισμού παλαιότερων οφειλών
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
from financial.services import FinancialDashboardService
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_previous_obligations_calculation():
    """Ελέγχει πώς υπολογίζονται οι παλαιότερες οφειλές"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        service = FinancialDashboardService(building_id=1)
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"📅 Financial system start date: {building.financial_system_start_date}")
        
        # Έλεγχος για Οκτώβριο 2025
        october_data = service.get_summary('2025-10')
        print(f"\n📊 Οκτώβριος 2025:")
        print(f"   previous_obligations: {format_currency(october_data.get('previous_obligations', 0))}")
        print(f"   current_obligations: {format_currency(october_data.get('current_obligations', 0))}")
        print(f"   total_balance: {format_currency(october_data.get('total_balance', 0))}")
        
        # Έλεγχος για Σεπτέμβριο 2025
        september_data = service.get_summary('2025-09')
        print(f"\n📊 Σεπτέμβριος 2025:")
        print(f"   previous_obligations: {format_currency(september_data.get('previous_obligations', 0))}")
        print(f"   current_obligations: {format_currency(september_data.get('current_obligations', 0))}")
        print(f"   total_balance: {format_currency(september_data.get('total_balance', 0))}")
        
        # Έλεγχος για Αύγουστο 2025
        august_data = service.get_summary('2025-08')
        print(f"\n📊 Αύγουστος 2025:")
        print(f"   previous_obligations: {format_currency(august_data.get('previous_obligations', 0))}")
        print(f"   current_obligations: {format_currency(august_data.get('current_obligations', 0))}")
        print(f"   total_balance: {format_currency(august_data.get('total_balance', 0))}")
        
        return {
            'october': october_data,
            'september': september_data,
            'august': august_data
        }

def check_apartment_balances_detailed():
    """Ελέγχει λεπτομερώς τα υπόλοιπα διαμερισμάτων"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("=" * 80)
    
    with schema_context('demo'):
        service = FinancialDashboardService(building_id=1)
        
        # Έλεγχος για Οκτώβριο 2025
        october_balances = service.get_apartment_balances('2025-10')
        print(f"\n📊 Υπόλοιπα διαμερισμάτων - Οκτώβριος 2025:")
        
        total_previous_obligations = Decimal('0.00')
        for balance in october_balances:
            apartment_number = balance['apartment_number']
            previous_balance = balance.get('previous_balance', 0)
            current_balance = balance.get('current_balance', 0)
            net_obligation = balance.get('net_obligation', 0)
            
            print(f"   🏠 {apartment_number}:")
            print(f"      Previous balance: {format_currency(previous_balance)}")
            print(f"      Current balance: {format_currency(current_balance)}")
            print(f"      Net obligation: {format_currency(net_obligation)}")
            
            total_previous_obligations += Decimal(str(previous_balance))
        
        print(f"\n💰 Σύνολο previous obligations: {format_currency(total_previous_obligations)}")
        
        return total_previous_obligations

def check_historical_balance_calculation():
    """Ελέγχει τον υπολογισμό ιστορικού υπολοίπου"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΙΣΤΟΡΙΚΟΥ ΥΠΟΛΟΙΠΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        service = FinancialDashboardService(building_id=1)
        apartments = Apartment.objects.filter(building_id=1)
        
        # Έλεγχος για ένα διαμέρισμα (διαμέρισμα 1)
        apartment = apartments.first()
        print(f"\n🏠 Διαμέρισμα: {apartment.number}")
        
        # Υπολογισμός ιστορικού υπολοίπου για 1 Οκτωβρίου 2025
        october_start = date(2025, 10, 1)
        historical_balance = service._calculate_historical_balance(apartment, october_start)
        
        print(f"📅 Ιστορικό υπόλοιπο μέχρι 1 Οκτωβρίου 2025: {format_currency(historical_balance)}")
        
        # Έλεγχος συναλλαγών μέχρι 1 Οκτωβρίου
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lt=october_start
        ).order_by('date')
        
        print(f"\n📋 Συναλλαγές μέχρι 1 Οκτωβρίου: {transactions.count()}")
        
        running_balance = Decimal('0.00')
        for transaction in transactions:
            if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                running_balance += transaction.amount
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                    'interest_charge', 'penalty_charge']:
                running_balance -= transaction.amount
            elif transaction.type == 'balance_adjustment':
                if transaction.balance_after is not None:
                    running_balance = transaction.balance_after
            
            print(f"   {transaction.date.strftime('%d/%m/%Y')}: {transaction.type} {format_currency(transaction.amount)} → {format_currency(running_balance)}")
        
        print(f"\n✅ Υπολογισμένο υπόλοιπο: {format_currency(running_balance)}")
        print(f"✅ Ιστορικό υπόλοιπο: {format_currency(historical_balance)}")
        
        if abs(running_balance - historical_balance) < Decimal('0.01'):
            print("   ✅ Τα υπόλοιπα ταιριάζουν!")
        else:
            print("   ❌ Υπάρχει διαφορά!")
        
        return historical_balance

def check_month_to_month_transfer():
    """Ελέγχει τη μεταφορά οφειλών από μήνα σε μήνα"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΟΦΕΙΛΩΝ ΑΠΟ ΜΗΝΑ ΣΕ ΜΗΝΑ")
    print("=" * 80)
    
    with schema_context('demo'):
        service = FinancialDashboardService(building_id=1)
        
        # Έλεγχος μεταφοράς από Σεπτέμβριο σε Οκτώβριο
        september_data = service.get_summary('2025-09')
        october_data = service.get_summary('2025-10')
        
        print(f"\n📊 Μεταφορά από Σεπτέμβριο σε Οκτώβριο:")
        print(f"   Σεπτέμβριος total_balance: {format_currency(september_data.get('total_balance', 0))}")
        print(f"   Οκτώβριος previous_obligations: {format_currency(october_data.get('previous_obligations', 0))}")
        
        september_balance = Decimal(str(september_data.get('total_balance', 0)))
        october_previous = Decimal(str(october_data.get('previous_obligations', 0)))
        
        if abs(september_balance - october_previous) < Decimal('0.01'):
            print("   ✅ Η μεταφορά είναι σωστή!")
        else:
            print("   ❌ Υπάρχει πρόβλημα στη μεταφορά!")
            print(f"   Διαφορά: {format_currency(september_balance - october_previous)}")
        
        return {
            'september_balance': september_balance,
            'october_previous': october_previous,
            'transfer_correct': abs(september_balance - october_previous) < Decimal('0.01')
        }

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ")
    print("=" * 80)
    
    try:
        # 1. Έλεγχος υπολογισμού παλαιότερων οφειλών
        obligations_data = check_previous_obligations_calculation()
        
        # 2. Έλεγχος λεπτομερών υπολοίπων διαμερισμάτων
        total_previous_obligations = check_apartment_balances_detailed()
        
        # 3. Έλεγχος υπολογισμού ιστορικού υπολοίπου
        historical_balance = check_historical_balance_calculation()
        
        # 4. Έλεγχος μεταφοράς από μήνα σε μήνα
        transfer_data = check_month_to_month_transfer()
        
        # Συνοπτικά αποτελέσματα
        print("\n" + "=" * 80)
        print("📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("=" * 80)
        print(f"💰 Σύνολο previous obligations: {format_currency(total_previous_obligations)}")
        print(f"💰 Ιστορικό υπόλοιπο: {format_currency(historical_balance)}")
        print(f"🔄 Μεταφορά σωστή: {'Ναι' if transfer_data['transfer_correct'] else 'Όχι'}")
        
        # Ανάλυση
        print(f"\n🔍 ΑΝΑΛΥΣΗ:")
        if total_previous_obligations == 0:
            print("   ⚠️  Δεν υπάρχουν παλαιότερες οφειλές")
            print("   💡 Αυτό μπορεί να είναι σωστό αν το σύστημα ξεκίνησε πρόσφατα")
        else:
            print("   ✅ Υπάρχουν παλαιότερες οφειλές")
            print("   💡 Ελέγξτε αν η μεταφορά από μήνα σε μήνα είναι σωστή")
        
        if not transfer_data['transfer_correct']:
            print("   ❌ ΠΡΟΒΛΗΜΑ: Η μεταφορά από μήνα σε μήνα δεν είναι σωστή!")
            print("   💡 Χρειάζεται διόρθωση στον υπολογισμό")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
