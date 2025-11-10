#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from maintenance.models import ScheduledMaintenance, PaymentReceipt

with schema_context('demo'):
    print("=== ANALYZING DUPLICATE EXPENSES ===\n")
    
    # Find fire extinguisher expenses
    expenses = Expense.objects.filter(
        title__icontains='Έλεγχος Πυροσβεστήρων'
    ).order_by('date', 'created_at')
    
    print(f"Found {expenses.count()} fire extinguisher expenses:\n")
    
    for expense in expenses:
        print(f"💰 ID: {expense.id}")
        print(f"   Title: {expense.title}")
        print(f"   Amount: €{expense.amount}")
        print(f"   Date: {expense.date}")
        print(f"   Category: {expense.category}")
        print(f"   Created: {expense.created_at}")
        print(f"   Notes: {expense.notes}")
        
        # Check if linked to PaymentReceipt (from sync_payment_expenses)
        receipts = PaymentReceipt.objects.filter(linked_expense=expense)
        if receipts.exists():
            print(f"   🔗 Linked to PaymentReceipt ID: {receipts.first().id}")
            print(f"   🔗 Source: sync_payment_expenses command")
        else:
            print(f"   🔗 Source: likely ScheduledMaintenance.create_or_update_expense()")
            
        # Check if maintenance is linked
        maintenance = ScheduledMaintenance.objects.filter(linked_expense=expense).first()
        if maintenance:
            print(f"   🏠 Linked Maintenance: {maintenance.id} - {maintenance.title}")
        
        print()
    
    print("=== ISSUE ANALYSIS ===")
    print("1. sync_payment_expenses command creates expenses with PaymentReceipt links")
    print("2. ScheduledMaintenance.create_or_update_expense() also creates expenses")
    print("3. Both run for the same maintenance record, causing duplicates")
    print()
    print("SOLUTION: Coordinate the two systems or disable one of them")