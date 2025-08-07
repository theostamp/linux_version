#!/usr/bin/env python3
"""
Script για έλεγχο και διόρθωση του οικονομικού ισοζυγίου
"""

import os
import sys
import django

# Setup Django
sys.path.append('/home/theo/projects/linux_version/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum

def check_financial_balance():
    """Έλεγχος και διόρθωση του οικονομικού ισοζυγίου"""
    print("🔍 ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΟΥ ΙΣΟΖΥΓΙΟΥ")
    print("=" * 60)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Check in demo tenant
    with tenant_context(client):
        # Get building
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Τρέχον αποθεματικό στη βάση: {building.current_reserve or Decimal('0.00'):10.2f}€")
        
        # Calculate correct reserve from payments and expenses
        total_payments = Payment.objects.all().aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = Expense.objects.all().aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        correct_reserve = total_payments - total_expenses
        
        print(f"\n📊 Υπολογισμός σωστού αποθεματικού:")
        print(f"  - Συνολικές εισπράξεις: {total_payments:10.2f}€")
        print(f"  - Συνολικές δαπάνες: {total_expenses:10.2f}€")
        print(f"  - Σωστό αποθεματικό: {correct_reserve:10.2f}€")
        
        # Check if there's a discrepancy
        current_reserve = building.current_reserve or Decimal('0.00')
        if abs(current_reserve - correct_reserve) > Decimal('0.01'):
            print(f"\n⚠️  ΒΡΕΘΗΚΕ ΔΙΑΦΟΡΑ:")
            print(f"  - Τρέχον στη βάση: {current_reserve:10.2f}€")
            print(f"  - Σωστό υπολογισμένο: {correct_reserve:10.2f}€")
            print(f"  - Διαφορά: {abs(correct_reserve - current_reserve):10.2f}€")
            
            # Fix the reserve
            building.current_reserve = correct_reserve
            building.save()
            
            print(f"\n✅ ΔΙΟΡΘΩΘΗΚΕ ΤΟ ΑΠΟΘΕΜΑΤΙΚΟ:")
            print(f"  - Ενημερώθηκε σε: {correct_reserve:10.2f}€")
        else:
            print(f"\n✅ Το αποθεματικό είναι σωστό!")
        
        # Verify the fix
        building.refresh_from_db()
        print(f"\n🔍 Επιβεβαίωση:")
        print(f"  - Τρέχον αποθεματικό στη βάση: {building.current_reserve:10.2f}€")
        
        # Additional checks
        print(f"\n📋 Επιπλέον στοιχεία:")
        print(f"  - Αριθμός εισπράξεων: {Payment.objects.count()}")
        print(f"  - Αριθμός δαπανών: {Expense.objects.count()}")
        
        # Check pending expenses
        pending_expenses = Expense.objects.filter(is_issued=False)
        total_pending = pending_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"  - Ανέκδοτες δαπάνες: {total_pending:10.2f}€ ({pending_expenses.count()} δαπάνες)")
        
        print(f"\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    check_financial_balance()
