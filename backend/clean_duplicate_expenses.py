#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from maintenance.models import PaymentReceipt

with schema_context('demo'):
    print("=== CLEANING DUPLICATE EXPENSES ===\n")
    
    # Find expenses that are NOT linked to PaymentReceipt (old system duplicates)
    fire_expenses = Expense.objects.filter(
        title__icontains='Έλεγχος Πυροσβεστήρων'
    )
    
    duplicates_to_delete = []
    for expense in fire_expenses:
        # Check if linked to PaymentReceipt (new system)
        receipts = PaymentReceipt.objects.filter(linked_expense=expense)
        if not receipts.exists():
            # This is from old system - mark for deletion
            duplicates_to_delete.append(expense)
    
    print(f"Found {len(duplicates_to_delete)} duplicate expenses to delete:")
    
    for expense in duplicates_to_delete:
        print(f"🗑️  ID: {expense.id} - {expense.title} (€{expense.amount})")
        print(f"     Created: {expense.created_at}")
        print(f"     Notes: {expense.notes}")
        
        # Delete the duplicate
        expense.delete()
        print(f"     ✅ Deleted")
        print()
    
    print("=== REMAINING EXPENSES ===")
    remaining = Expense.objects.filter(title__icontains='Έλεγχος Πυροσβεστήρων')
    total = 0
    for expense in remaining:
        print(f"✅ ID: {expense.id} - {expense.title} (€{expense.amount}) - {expense.date}")
        total += expense.amount
    
    print(f"\n🎯 Total remaining expenses: €{total}")
    print("✅ All duplicates cleaned up!")