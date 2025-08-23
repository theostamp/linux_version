#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense
from decimal import Decimal
from django.db.models import Sum

print("🔍 ΕΝΤΟΠΙΣΜΟΣ ΠΗΓΗΣ ΥΠΟΛΟΙΠΟΥ ΑΡΑΧΩΒΗΣ 12")
print("=" * 60)

with schema_context('demo'):
    # Find Αραχώβης 12 building
    building = Building.objects.get(id=3)  # Αραχώβης 12
    print(f"✅ Κτίριο: {building.name}")
    print(f"   ID: {building.id}")
    print(f"   Τρέχον αποθεματικό: {building.current_reserve}€")
    print()
    
    # Calculate total payments
    total_payments = Payment.objects.filter(apartment__building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    # Calculate total expenses
    total_expenses = Expense.objects.filter(building=building).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    # Calculate reserve
    calculated_reserve = total_payments - total_expenses
    
    print(f"📊 ΥΠΟΛΟΓΙΣΜΟΣ:")
    print(f"   Συνολικές εισπράξεις: {total_payments}€")
    print(f"   Συνολικές δαπάνες: {total_expenses}€")
    print(f"   Υπολογισμένο αποθεματικό: {calculated_reserve}€")
    print(f"   Αποθεματικό στη βάση: {building.current_reserve}€")
    print()
    
    # Check if they match
    if abs(calculated_reserve - building.current_reserve) < Decimal('0.01'):
        print(f"✅ Τα ποσά ταιριάζουν! Το 7.712,68€ είναι το αποθεματικό.")
        print(f"   Πηγή: Εισπράξεις ({total_payments}€) - Δαπάνες ({total_expenses}€)")
    else:
        print(f"❌ Διαφορά: {calculated_reserve}€ vs {building.current_reserve}€")
    
    print()
    
    # Show individual payments
    print("💰 ΕΙΣΠΡΑΞΕΙΣ:")
    payments = Payment.objects.filter(apartment__building=building).order_by('date')
    for payment in payments:
        print(f"   {payment.date.strftime('%d/%m/%Y')}: {payment.apartment.number} - {payment.amount}€")
    
    print()
    
    # Show individual expenses
    print("💸 ΔΑΠΑΝΕΣ:")
    expenses = Expense.objects.filter(building=building).order_by('date')
    for expense in expenses:
        print(f"   {expense.date.strftime('%d/%m/%Y')}: {expense.title} - {expense.amount}€")
