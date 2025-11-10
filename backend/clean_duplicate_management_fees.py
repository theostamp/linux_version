#!/usr/bin/env python3
"""
Script για καθαρισμό διπλών management fee transactions
Διαγράφει τα management_fee transactions και κρατάει μόνο τα expense_created
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

def clean_duplicate_management_fees():
    """Καθαρισμός διπλών management fee transactions"""
    
    with schema_context('demo'):
        print("🧹 Καθαρισμός Διπλών Management Fee Transactions")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        
        # Έλεγχος πριν τη διαγραφή
        print(f"\n🔍 Έλεγχος πριν τη διαγραφή:")
        
        management_fee_transactions = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        )
        
        expense_created_transactions = Transaction.objects.filter(
            apartment__building=building,
            type='expense_created'
        )
        
        print(f"   - Management_fee transactions: {management_fee_transactions.count()}")
        print(f"   - Expense_created transactions: {expense_created_transactions.count()}")
        
        if management_fee_transactions.exists():
            management_fee_total = management_fee_transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό management_fee: €{management_fee_total}")
        
        if expense_created_transactions.exists():
            expense_created_total = expense_created_transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό expense_created: €{expense_created_total}")
        
        # Διαγραφή management_fee transactions
        print(f"\n🗑️ Διαγραφή management_fee transactions:")
        
        deleted_count = 0
        deleted_amount = Decimal('0.00')
        
        for transaction in management_fee_transactions:
            deleted_amount += transaction.amount
            transaction.delete()
            deleted_count += 1
        
        print(f"   - Διαγράφηκαν {deleted_count} transactions")
        print(f"   - Συνολικό ποσό που διαγράφηκε: €{deleted_amount}")
        
        # Έλεγχος μετά τη διαγραφή
        print(f"\n🔍 Έλεγχος μετά τη διαγραφή:")
        
        remaining_management_fee = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        ).count()
        
        remaining_expense_created = Transaction.objects.filter(
            apartment__building=building,
            type='expense_created'
        ).count()
        
        print(f"   - Υπόλοιπα management_fee transactions: {remaining_management_fee}")
        print(f"   - Υπόλοιπα expense_created transactions: {remaining_expense_created}")
        
        # Έλεγχος expenses
        management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees'
        )
        
        print(f"\n📊 Management Fees Expenses:")
        print(f"   - Αριθμός expenses: {management_expenses.count()}")
        
        if management_expenses.exists():
            expenses_total = management_expenses.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό expenses: €{expenses_total}")
        
        print("\n" + "=" * 60)
        print("✅ Καθαρισμός ολοκληρώθηκε")

if __name__ == "__main__":
    clean_duplicate_management_fees()
