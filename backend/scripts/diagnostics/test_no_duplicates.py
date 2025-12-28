#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance
from financial.models import Expense

with schema_context('demo'):
    print("=== TESTING DUPLICATE PREVENTION ===\n")
    
    # Get the maintenance record
    maintenance = ScheduledMaintenance.objects.get(id=9)
    print(f"Testing with maintenance: {maintenance.title}")
    
    # Count expenses before
    expenses_before = Expense.objects.filter(title__icontains='Έλεγχος Πυροσβεστήρων').count()
    print(f"Expenses before: {expenses_before}")
    
    # Try to create expenses via the old system
    print("\nTrying to call create_or_update_expense()...")
    result = maintenance.create_or_update_expense()
    
    # Count expenses after
    expenses_after = Expense.objects.filter(title__icontains='Έλεγχος Πυροσβεστήρων').count()
    print(f"Expenses after: {expenses_after}")
    
    if expenses_after == expenses_before:
        print("✅ SUCCESS: No duplicate expenses created!")
        print("✅ The system correctly prevented duplicate creation")
    else:
        print(f"❌ FAILED: {expenses_after - expenses_before} new expenses created")
        
    print(f"\nResult from create_or_update_expense(): {result}")