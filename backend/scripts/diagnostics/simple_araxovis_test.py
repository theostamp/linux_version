#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Payment, Expense
from decimal import Decimal
from django.db.models import Sum

with schema_context('demo'):
    building = Building.objects.filter(name__icontains='Αραχώβης').first()
    if building:
        print(f"Building: {building.name}")
        print(f"ID: {building.id}")
        print(f"Current reserve: {building.current_reserve}€")
        
        # Check payments and expenses
        total_payments = Payment.objects.filter(apartment__building=building).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = Expense.objects.filter(building=building).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"Total payments: {total_payments}€")
        print(f"Total expenses: {total_expenses}€")
        print(f"Calculated reserve: {total_payments - total_expenses}€")
    else:
        print("Αραχώβης building not found")
