#!/usr/bin/env python3
"""
Quick financial check to see current state
"""

import os
import sys
import django
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Building, Payment, Expense
from django.db.models import Sum
from datetime import datetime

def quick_financial_check():
    """Quick check of current financial state"""
    
    print("🔍 ΓΡΗΓΟΡΟΣ ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΩΝ")
    print("=" * 40)
    
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Demo tenant βρέθηκε")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    with tenant_context(client):
        # Check building 1 (Αθηνών 12)
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # All payments
        all_payments = Payment.objects.filter(apartment__building_id=1)
        total_payments = all_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"💰 Συνολικές εισπράξεις: {total_payments:10.2f}€ ({all_payments.count()} πληρωμές)")
        
        # All expenses
        all_expenses = Expense.objects.filter(building_id=1)
        total_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"💸 Συνολικές δαπάνες: {total_expenses:10.2f}€ ({all_expenses.count()} δαπάνες)")
        
        # Current reserve
        current_reserve = total_payments - total_expenses
        print(f"🏦 Τρέχον αποθεματικό: {current_reserve:10.2f}€")
        
        # August 2025 payments
        august_payments = Payment.objects.filter(
            apartment__building_id=1,
            date__gte=datetime(2025, 8, 1)
        )
        august_total = august_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"📅 Εισπράξεις Αύγουστου: {august_total:10.2f}€ ({august_payments.count()} πληρωμές)")
        
        # Show recent payments
        print(f"\n💳 ΠΡΟΣΦΑΤΕΣ ΠΛΗΡΩΜΕΣ:")
        recent = all_payments.order_by('-date')[:3]
        for payment in recent:
            print(f"  - {payment.apartment.number}: {payment.amount:8.2f}€ ({payment.date})")
        
        print(f"\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    quick_financial_check()
