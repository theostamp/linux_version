#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment
from buildings.models import Building
from django.db.models import Sum

with schema_context('demo'):
    building = Building.objects.get(id=1)
    print(f"Building: {building.name}")
    print(f"Expenses: {Expense.objects.filter(building=building).count()}")
    print(f"Payments: {Payment.objects.filter(apartment__building=building).count()}")
    
    if Expense.objects.filter(building=building).exists():
        total_expenses = Expense.objects.filter(building=building).aggregate(total=Sum('amount'))['total']
        print(f"Total expenses: {total_expenses}€")
    
    if Payment.objects.filter(apartment__building=building).exists():
        total_payments = Payment.objects.filter(apartment__building=building).aggregate(total=Sum('amount'))['total']
        print(f"Total payments: {total_payments}€")
