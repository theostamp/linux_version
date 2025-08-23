#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

print("Starting analysis...", flush=True)

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense
from decimal import Decimal
from django.db.models import Sum

print("Imports complete...", flush=True)

with schema_context('demo'):
    print("In demo schema context...", flush=True)
    
    # Find Αραχώβης 12 building
    building = Building.objects.get(id=3)  # Αραχώβης 12
    print(f"Building found: {building.name}", flush=True)
    print(f"Current reserve: {building.current_reserve}€", flush=True)
    
    # Calculate total payments
    total_payments = Payment.objects.filter(apartment__building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    print(f"Total payments: {total_payments}€", flush=True)
    
    # Calculate total expenses
    total_expenses = Expense.objects.filter(building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    print(f"Total expenses: {total_expenses}€", flush=True)
    
    # Calculate reserve
    calculated_reserve = total_payments - total_expenses
    print(f"Calculated reserve: {calculated_reserve}€", flush=True)
    
    if abs(calculated_reserve - building.current_reserve) < Decimal('0.01'):
        print("✅ MATCH! The 7,712.68€ is the current reserve.", flush=True)
    else:
        print("❌ NO MATCH!", flush=True)
