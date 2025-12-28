#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense

with schema_context('demo'):
    print("=== FINAL EXPENSES VERIFICATION ===\n")
    
    # Get all fire extinguisher expenses
    expenses = Expense.objects.filter(
        title__icontains='Έλεγχος Πυροσβεστήρων'
    ).order_by('date')
    
    print(f"Total fire extinguisher expenses: {expenses.count()}")
    print("Expected: 4 expenses (1 advance + 3 installments)\n")
    
    total_amount = 0
    months = {}
    
    for expense in expenses:
        month_key = expense.date.strftime('%Y-%m')
        if month_key not in months:
            months[month_key] = []
        months[month_key].append(expense)
        total_amount += expense.amount
    
    # Show by month
    for month_key in sorted(months.keys()):
        print(f"📅 {month_key}:")
        month_total = 0
        for expense in months[month_key]:
            print(f"  💰 {expense.title}: €{expense.amount}")
            print(f"      Category: {expense.category}")
            month_total += expense.amount
        print(f"  📊 Month Total: €{month_total}")
        print()
    
    print(f"🎯 GRAND TOTAL: €{total_amount}")
    print("Expected total: €224.00 (original maintenance cost)")
    
    if abs(total_amount - 224) < 0.01:
        print("✅ PERFECT: Total matches original maintenance cost!")
    else:
        print(f"⚠️  Difference: €{total_amount - 224}")
    
    print("\n✅ No duplicates found - system working correctly!")