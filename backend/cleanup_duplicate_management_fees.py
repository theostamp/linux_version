#!/usr/bin/env python3
"""
Καθαρισμός διπλών Management Fees Expenses
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from collections import defaultdict

def cleanup_duplicate_management_fees():
    """Καθαρίζει τα διπλά management fees expenses"""
    
    print("🧹 ΚΑΘΑΡΙΣΜΟΣ ΔΙΠΛΩΝ MANAGEMENT FEES")
    print("=" * 50)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Βρίσκουμε όλα τα management fees expenses για 2025
        management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025
        ).order_by('date', 'id')
        
        print(f"📊 Συνολικά management fees expenses: {management_expenses.count()}")
        
        # Ομαδοποιούμε ανά μήνα
        expenses_by_month = defaultdict(list)
        for expense in management_expenses:
            month_key = expense.date.strftime('%Y-%m')
            expenses_by_month[month_key].append(expense)
        
        print(f"📊 Μήνες με expenses: {len(expenses_by_month)}")
        
        # Διαγράφουμε τα διπλά (κρατάμε μόνο το πρώτο)
        deleted_count = 0
        for month, expenses in expenses_by_month.items():
            if len(expenses) > 1:
                print(f"🗑️ Μήνας {month}: {len(expenses)} expenses - διαγράφω {len(expenses)-1}")
                
                # Κρατάμε το πρώτο, διαγράφουμε τα υπόλοιπα
                for expense in expenses[1:]:
                    # Διαγράφουμε και τα σχετικά transactions
                    related_transactions = Transaction.objects.filter(
                        reference_type='expense',
                        reference_id=str(expense.id)
                    )
                    print(f"  🗑️ Διαγράφω expense ID {expense.id} και {related_transactions.count()} transactions")
                    related_transactions.delete()
                    expense.delete()
                    deleted_count += 1
        
        print(f"\n✅ ΚΑΘΑΡΙΣΜΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ:")
        print(f"Διαγράφηκαν {deleted_count} διπλά expenses")
        
        # Επαλήθευση
        remaining_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025
        )
        
        print(f"📊 Εναπομείναντα expenses: {remaining_expenses.count()}")
        
        for expense in remaining_expenses:
            print(f"  ✅ {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f} (ID: {expense.id})")

if __name__ == "__main__":
    cleanup_duplicate_management_fees()
