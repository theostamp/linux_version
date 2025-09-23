#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from django.http import QueryDict
from datetime import datetime, date

with schema_context('demo'):
    print("🔍 Έλεγχος API παραμέτρων για expenses")
    print("=" * 50)

    # Δοκιμάζω τα filters που χρησιμοποιεί το API
    expenses = Expense.objects.filter(
        date__gte='2024-09-01',
        date__lte='2024-10-31'
    )

    print(f"\n📊 Δαπάνες Σεπ-Οκτ 2024: {expenses.count()}")

    if expenses.exists():
        print("\nΔαπάνες:")
        for expense in expenses:
            print(f"   - {expense.date} | {expense.title} | {expense.amount}€")
            # Print all fields to see the structure
            print(f"     Fields: date={expense.date}, category={expense.category}, expense_type={expense.expense_type}")

    print("\n" + "=" * 50)
    print("✅ Έλεγχος ολοκληρώθηκε")