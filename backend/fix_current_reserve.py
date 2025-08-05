#!/usr/bin/env python3
"""
Script για διόρθωση του Τρέχοντος Αποθεματικού
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum

def fix_current_reserve():
    """Διόρθωση του Τρέχοντος Αποθεματικού"""
    print("🔧 ΔΙΟΡΘΩΣΗ ΤΡΕΧΟΝΤΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
    print("=" * 50)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Fix in demo tenant
    with tenant_context(client):
        # Get building
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve or Decimal('0.00'):10.2f}€")
        
        # Calculate correct reserve
        total_payments = Payment.objects.all().aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = Expense.objects.all().aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        correct_reserve = total_payments - total_expenses
        
        print(f"\n📊 Υπολογισμός σωστού αποθεματικού:")
        print(f"  - Συνολικές εισπράξεις: {total_payments:10.2f}€")
        print(f"  - Συνολικές δαπάνες: {total_expenses:10.2f}€")
        print(f"  - Σωστό αποθεματικό: {correct_reserve:10.2f}€")
        
        # Update building reserve
        if building.current_reserve != correct_reserve:
            old_reserve = building.current_reserve or Decimal('0.00')
            building.current_reserve = correct_reserve
            building.save()
            
            print(f"\n✅ Ενημέρωση αποθεματικού:")
            print(f"  - Παλιό: {old_reserve:10.2f}€")
            print(f"  - Νέο: {correct_reserve:10.2f}€")
            print(f"  - Διαφορά: {correct_reserve - old_reserve:10.2f}€")
        else:
            print(f"\n✅ Το αποθεματικό είναι ήδη σωστό!")
        
        # Verify the fix
        building.refresh_from_db()
        print(f"\n🔍 Επιβεβαίωση:")
        print(f"  - Τρέχον αποθεματικό στη βάση: {building.current_reserve:10.2f}€")
        
        if building.current_reserve == correct_reserve:
            print("  ✅ Διόρθωση επιτυχής!")
        else:
            print("  ❌ Διόρθωση απέτυχε!")

if __name__ == "__main__":
    fix_current_reserve() 