#!/usr/bin/env python
import os
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from maintenance.models import ScheduledMaintenance

with schema_context('demo'):
    # Έλεγχος όλων των δαπανών
    all_expenses = Expense.objects.all()
    print(f"\n📊 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ: {all_expenses.count()}")
    
    # Δείξε τις πιο πρόσφατες δαπάνες
    recent_expenses = Expense.objects.order_by('-created_at')[:10]
    
    print("\n📝 ΠΡΟΣΦΑΤΕΣ ΔΑΠΑΝΕΣ:")
    for exp in recent_expenses:
        print(f"\n  • ID: {exp.id}")
        print(f"    Title: {exp.title}")
        print(f"    Amount: {exp.amount}€")
        print(f"    Notes: {exp.notes[:100] if exp.notes else 'None'}")
        print(f"    Created: {exp.created_at}")
        
    # Έλεγχος για δαπάνες με pattern προσφοράς
    offer_expenses = Expense.objects.filter(title__icontains='Αντικατάσταση Λέβητα')
    print(f"\n🔍 ΔΑΠΑΝΕΣ 'Αντικατάσταση Λέβητα': {offer_expenses.count()}")
    
    for exp in offer_expenses:
        print(f"  • {exp.title}: {exp.amount}€")
