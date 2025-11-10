#!/usr/bin/env python3
"""
Script για debug του υπολογισμού management fees
Ελέγχει τι ακριβώς συμβαίνει στον υπολογισμό
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

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction, Expense
from django.utils import timezone
from django.db.models import Sum

def debug_management_fees_calculation():
    """Debug του υπολογισμού management fees"""
    
    with schema_context('demo'):
        print("🔍 DEBUG Management Fees Calculation")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        
        # Ελέγχος για Σεπτέμβριο 2024
        current_month = "2024-09"
        print(f"📅 Τρέχον μήνας: {current_month}")
        
        # Υπολογισμός month_start
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        print(f"📅 Month start: {month_start}")
        
        # Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Ελέγχος expenses
        print(f"\n📊 Management Fees Expenses:")
        management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees'
        ).order_by('date')
        
        print(f"   - Συνολικός αριθμός: {management_expenses.count()}")
        
        for expense in management_expenses:
            print(f"   - {expense.date.strftime('%Y-%m')}: €{expense.amount}")
        
        # Ελέγχος transactions για ένα διαμέρισμα
        apartment = apartments.first()
        print(f"\n🏠 Ελέγχος διαμερίσματος {apartment.number}:")
        
        # Όλες οι expense_created transactions
        all_expense_created = Transaction.objects.filter(
            apartment=apartment,
            type='expense_created',
            reference_type='expense'
        ).order_by('date')
        
        print(f"   - Όλες οι expense_created transactions: {all_expense_created.count()}")
        
        for transaction in all_expense_created:
            print(f"   - {transaction.date.strftime('%Y-%m-%d')}: €{transaction.amount} (ref: {transaction.reference_id})")
        
        # Transactions πριν από month_start
        transactions_before = Transaction.objects.filter(
            apartment=apartment,
            type='expense_created',
            reference_type='expense',
            date__lt=month_start
        )
        
        print(f"\n📅 Transactions πριν από {month_start}:")
        print(f"   - Αριθμός: {transactions_before.count()}")
        
        for transaction in transactions_before:
            print(f"   - {transaction.date.strftime('%Y-%m-%d')}: €{transaction.amount} (ref: {transaction.reference_id})")
        
        # Φιλτράρισμα για management_fees expenses
        management_expense_ids = []
        for transaction in transactions_before:
            try:
                expense_id = int(transaction.reference_id)
                expense = Expense.objects.filter(id=expense_id, category='management_fees').first()
                if expense:
                    management_expense_ids.append(expense_id)
                    print(f"   ✅ Management fee expense: {expense_id} - {expense.date.strftime('%Y-%m')} - €{expense.amount}")
            except (ValueError, TypeError):
                print(f"   ❌ Invalid reference_id: {transaction.reference_id}")
        
        print(f"\n📊 Management fee expense IDs: {management_expense_ids}")
        
        # Υπολογισμός συνολικού ποσού
        if management_expense_ids:
            management_fees_total = Transaction.objects.filter(
                apartment=apartment,
                type='expense_created',
                reference_id__in=[str(exp_id) for exp_id in management_expense_ids],
                date__lt=month_start
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"💰 Συνολικό ποσό management fees: €{management_fees_total}")
        
        print("\n" + "=" * 60)
        print("✅ Debug ολοκληρώθηκε")

if __name__ == "__main__":
    debug_management_fees_calculation()