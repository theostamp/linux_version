#!/usr/bin/env python3
"""
Script για έλεγχο και διόρθωση των οικονομικών ισοζυγίων
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
from financial.models import Payment, Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal
from django.db.models import Sum

def check_and_fix_financial_balances():
    """Έλεγχος και διόρθωση των οικονομικών ισοζυγίων"""
    print("🔍 ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΩΝ ΙΣΟΖΥΓΙΩΝ")
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
        
        print("\n📊 Υπολογισμός σωστού αποθεματικού:")
        print(f"  - Συνολικές εισπράξεις: {total_payments:10.2f}€")
        print(f"  - Συνολικές δαπάνες: {total_expenses:10.2f}€")
        print(f"  - Σωστό αποθεματικό: {correct_reserve:10.2f}€")
        
        # Check if there's a discrepancy
        current_reserve = building.current_reserve or Decimal('0.00')
        if abs(current_reserve - correct_reserve) > Decimal('0.01'):
            print("\n⚠️  ΒΡΕΘΗΚΕ ΔΙΑΦΟΡΑ:")
            print(f"  - Τρέχον στη βάση: {current_reserve:10.2f}€")
            print(f"  - Σωστό υπολογισμένο: {correct_reserve:10.2f}€")
            print(f"  - Διαφορά: {abs(correct_reserve - current_reserve):10.2f}€")
            
            # Fix the reserve
            building.current_reserve = correct_reserve
            building.save()
            
            print("\n✅ ΔΙΟΡΘΩΘΗΚΕ ΤΟ ΑΠΟΘΕΜΑΤΙΚΟ:")
            print(f"  - Ενημερώθηκε σε: {correct_reserve:10.2f}€")
        else:
            print("\n✅ Το αποθεματικό είναι σωστό!")
        
        # Verify the fix
        building.refresh_from_db()
        print("\n🔍 Επιβεβαίωση:")
        print(f"  - Τρέχον αποθεματικό στη βάση: {building.current_reserve:10.2f}€")
        
        # Additional checks
        print("\n📋 Επιπλέον στοιχεία:")
        print(f"  - Αριθμός εισπράξεων: {Payment.objects.count()}")
        print(f"  - Αριθμός δαπανών: {Expense.objects.count()}")
        print(f"  - Αριθμός transactions: {Transaction.objects.count()}")
        
        # Check pending expenses
        pending_expenses = Expense.objects.filter(is_issued=False)
        total_pending = pending_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"  - Ανέκδοτες δαπάνες: {total_pending:10.2f}€ ({pending_expenses.count()} δαπάνες)")
        
        # Check apartment balances
        apartments = Apartment.objects.all()
        total_apartment_balances = sum(apt.current_balance or Decimal('0.00') for apt in apartments)
        print(f"  - Συνολικό υπόλοιπο διαμερισμάτων: {total_apartment_balances:10.2f}€")
        
        # Check if apartment balances sum to zero (they should)
        expected_zero_balance = total_payments - total_expenses - total_apartment_balances
        print(f"  - Επιβεβαίωση ισοζυγίου: {expected_zero_balance:10.2f}€ (πρέπει να είναι 0.00€)")
        
        if abs(expected_zero_balance) > Decimal('0.01'):
            print(f"  ⚠️  ΔΙΑΦΟΡΑ ΣΤΟ ΙΣΟΖΥΓΙΟ: {expected_zero_balance:10.2f}€")
        else:
            print("  ✅ Το ισοζύγιο είναι σωστό!")
        
        print("\n✅ Έλεγχος ολοκληρώθηκε")

def check_monthly_figures():
    """Έλεγχος των μηνιαίων στοιχείων"""
    print("\n📅 ΕΛΕΓΧΟΣ ΜΗΝΙΑΙΩΝ ΣΤΟΙΧΕΙΩΝ")
    print("=" * 60)
    
    try:
        client = Client.objects.get(schema_name='demo')
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    with tenant_context(client):
        from datetime import datetime
        
        # Get current month
        now = datetime.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate monthly figures
        monthly_payments = Payment.objects.filter(
            date__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        monthly_expenses = Expense.objects.filter(
            date__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📊 Στοιχεία για {current_month_start.strftime('%B %Y')}:")
        print(f"  - Εισπράξεις μήνα: {monthly_payments:10.2f}€")
        print(f"  - Δαπάνες μήνα: {monthly_expenses:10.2f}€")
        print(f"  - Διαφορά μήνα: {monthly_payments - monthly_expenses:10.2f}€")
        
        # Check if this matches what's shown in the dashboard
        building = Building.objects.first()
        if building:
            print(f"  - Τρέχον αποθεματικό: {building.current_reserve:10.2f}€")
            
            # The current reserve should be the cumulative difference
            # (not just the monthly difference)
            print(f"  - Σωστό αποθεματικό: {monthly_payments - monthly_expenses:10.2f}€ (μόνο μήνα)")
            print(f"  - Συνολικό αποθεματικό: {building.current_reserve:10.2f}€ (συνολικά)")

if __name__ == "__main__":
    check_and_fix_financial_balances()
    check_monthly_figures()
