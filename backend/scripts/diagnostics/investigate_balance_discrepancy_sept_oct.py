#!/usr/bin/env python3
"""
Script to investigate the 10€ discrepancy in previous obligations between September and October
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db.models import Sum, Q
from django_tenants.utils import schema_context

from apartments.models import Apartment
from financial.models import Payment, Expense, Transaction
from financial.services import FinancialDashboardService

def investigate_balance_discrepancy():
    """Investigate the 10€ discrepancy between September and October previous obligations"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🔍 ΕΡΕΥΝΑ ΔΙΑΦΟΡΑΣ 10 ΕΥΡΩ ΣΤΙΣ ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ")
        print("=" * 80)
        print("Σεπτέμβριος: 650,00 €")
        print("Οκτώβριος: 1.049,98 €")
        print("Διαφορά: 399,98 € (όχι 10 €)")
        print("=" * 80)
        
        # Get building ID 1 (Αλκμάνος 22)
        building_id = 1
        
        # 1. Check September data
        print("\n📅 ΣΕΠΤΕΜΒΡΙΟΣ 2024:")
        print("-" * 50)
        
        sept_service = FinancialDashboardService(building_id)
        sept_summary = sept_service.get_summary('2024-09')
        
        print(f"Συνολικές οφειλές διαμερισμάτων: {sept_summary.get('total_apartment_obligations', 0):.2f} €")
        print(f"Συνολικές πληρωμές: {sept_summary.get('total_payments', 0):.2f} €")
        print(f"Τρέχον υπόλοιπο: {sept_summary.get('current_reserve', 0):.2f} €")
        
        # Get apartment balances for September
        sept_apartments = sept_service.get_apartment_balances('2024-09')
        sept_total_previous = sum(abs(apt.get('previous_balance', 0)) for apt in sept_apartments)
        print(f"Συνολικές παλαιότερες οφειλές (Σεπτ): {sept_total_previous:.2f} €")
        
        # 2. Check October data
        print("\n📅 ΟΚΤΩΒΡΙΟΣ 2024:")
        print("-" * 50)
        
        oct_service = FinancialDashboardService(building_id)
        oct_summary = oct_service.get_summary('2024-10')
        
        print(f"Συνολικές οφειλές διαμερισμάτων: {oct_summary.get('total_apartment_obligations', 0):.2f} €")
        print(f"Συνολικές πληρωμές: {oct_summary.get('total_payments', 0):.2f} €")
        print(f"Τρέχον υπόλοιπο: {oct_summary.get('current_reserve', 0):.2f} €")
        
        # Get apartment balances for October
        oct_apartments = oct_service.get_apartment_balances('2024-10')
        oct_total_previous = sum(abs(apt.get('previous_balance', 0)) for apt in oct_apartments)
        print(f"Συνολικές παλαιότερες οφειλές (Οκτ): {oct_total_previous:.2f} €")
        
        # 3. Calculate the difference
        difference = oct_total_previous - sept_total_previous
        print(f"\n💰 ΔΙΑΦΟΡΑ: {difference:.2f} €")
        
        # 4. Check if there were any payments in September
        print("\n💳 ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ ΣΕΠΤΕΜΒΡΙΟΥ:")
        print("-" * 50)
        
        sept_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            date__year=2024,
            date__month=9
        ).select_related('apartment')
        
        print(f"Αριθμός πληρωμών Σεπτεμβρίου: {sept_payments.count()}")
        
        if sept_payments.exists():
            total_sept_payments = sept_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"Συνολικό ποσό πληρωμών Σεπτεμβρίου: {total_sept_payments:.2f} €")
            
            for payment in sept_payments:
                print(f"  - Διαμέρισμα {payment.apartment.number}: {payment.amount:.2f} € ({payment.date})")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές τον Σεπτέμβριο")
        
        # 5. Check transactions for September
        print("\n📊 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΣΕΠΤΕΜΒΡΙΟΥ:")
        print("-" * 50)
        
        sept_transactions = Transaction.objects.filter(
            date__year=2024,
            date__month=9
        ).order_by('date', 'apartment_number')
        
        print(f"Αριθμός συναλλαγών Σεπτεμβρίου: {sept_transactions.count()}")
        
        if sept_transactions.exists():
            for transaction in sept_transactions:
                print(f"  - {transaction.date.date()} | Διαμέρισμα {transaction.apartment_number} | {transaction.type} | {transaction.amount:.2f} €")
        else:
            print("❌ Δεν βρέθηκαν συναλλαγές τον Σεπτέμβριο")
        
        # 6. Check October expenses
        print("\n💸 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΟΚΤΩΒΡΙΟΥ:")
        print("-" * 50)
        
        oct_expenses = Expense.objects.filter(
            building_id=building_id,
            date__year=2024,
            date__month=10
        )
        
        print(f"Αριθμός δαπανών Οκτωβρίου: {oct_expenses.count()}")
        
        if oct_expenses.exists():
            total_oct_expenses = oct_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"Συνολικό ποσό δαπανών Οκτωβρίου: {total_oct_expenses:.2f} €")
            
            for expense in oct_expenses:
                print(f"  - {expense.title}: {expense.amount:.2f} € ({expense.date})")
        
        # 7. Detailed apartment analysis
        print("\n🏠 ΑΝΑΛΥΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        for apt in apartments:
            sept_apt_data = next((a for a in sept_apartments if a['id'] == apt.id), None)
            oct_apt_data = next((a for a in oct_apartments if a['id'] == apt.id), None)
            
            if sept_apt_data and oct_apt_data:
                sept_prev = abs(sept_apt_data.get('previous_balance', 0))
                oct_prev = abs(oct_apt_data.get('previous_balance', 0))
                diff = oct_prev - sept_prev
                
                if abs(diff) > 0.01:  # Show only apartments with significant difference
                    print(f"Διαμέρισμα {apt.number}:")
                    print(f"  Σεπτ παλαιότερες: {sept_prev:.2f} €")
                    print(f"  Οκτ παλαιότερες: {oct_prev:.2f} €")
                    print(f"  Διαφορά: {diff:.2f} €")
                    print()
        
        # 8. Check if the issue is in the calculation logic
        print("\n🔧 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ ΥΠΟΛΟΓΙΣΜΟΥ:")
        print("-" * 50)
        
        # Check current balances vs calculated balances
        print("Τρέχοντα υπόλοιπα διαμερισμάτων:")
        for apt in apartments:
            current_balance = apt.current_balance or Decimal('0.00')
            print(f"  Διαμέρισμα {apt.number}: {current_balance:.2f} €")
        
        print("\n" + "=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        
        if difference > 0:
            print(f"✅ Η διαφορά {difference:.2f} € στις παλαιότερες οφειλές είναι λογική")
            print("   επειδή προστέθηκαν νέες δαπάνες τον Οκτώβριο")
        else:
            print(f"❌ Η αρνητική διαφορά {difference:.2f} € δείχνει πρόβλημα")
            print("   στον υπολογισμό των παλαιότερων οφειλών")

if __name__ == "__main__":
    investigate_balance_discrepancy()
