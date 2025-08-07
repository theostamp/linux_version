#!/usr/bin/env python3
"""
Debug script to understand what the user is seeing vs actual system data
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
from financial.services import FinancialDashboardService
from django.db.models import Sum
from datetime import datetime

def debug_user_view():
    """Debug what the user is seeing vs actual system data"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΤΗΣ ΟΠΤΙΚΗΣ ΤΟΥ ΧΡΗΣΤΗ")
    print("=" * 50)
    
    try:
        client = Client.objects.get(schema_name='demo')
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Test in demo tenant
    with tenant_context(client):
        building = Building.objects.get(id=1)  # Κτίριο 1: Αθηνών 12
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        # Get current month (August 2025)
        current_month = datetime.now().replace(day=1)
        print(f"📅 Τρέχοντος μήνας: {current_month.strftime('%B %Y')}")
        
        # Monthly data (what user should see)
        monthly_payments = Payment.objects.filter(
            apartment__building_id=building.id,
            date__gte=current_month
        )
        monthly_expenses = Expense.objects.filter(
            building_id=building.id,
            date__gte=current_month
        )
        
        total_monthly_payments = monthly_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_monthly_expenses = monthly_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"\n📊 ΜΗΝΙΑΙΑ ΔΕΔΟΜΕΝΑ (Αύγουστος 2025):")
        print(f"  - Εισπράξεις μήνα: {total_monthly_payments:10.2f}€ ({monthly_payments.count()} πληρωμές)")
        print(f"  - Δαπάνες μήνα: {total_monthly_expenses:10.2f}€ ({monthly_expenses.count()} δαπάνες)")
        
        # All-time data (for current reserve calculation)
        all_payments = Payment.objects.filter(apartment__building_id=building.id)
        all_expenses = Expense.objects.filter(building_id=building.id)
        
        total_all_payments = all_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_all_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        current_reserve = total_all_payments - total_all_expenses
        
        print(f"\n📊 ΣΥΝΟΛΙΚΑ ΔΕΔΟΜΕΝΑ (για αποθεματικό):")
        print(f"  - Συνολικές εισπράξεις: {total_all_payments:10.2f}€ ({all_payments.count()} πληρωμές)")
        print(f"  - Συνολικές δαπάνες: {total_all_expenses:10.2f}€ ({all_expenses.count()} δαπάνες)")
        print(f"  - Τρέχον αποθεματικό: {current_reserve:10.2f}€")
        
        # Test the API service
        service = FinancialDashboardService(building.id)
        summary = service.get_summary()
        
        print(f"\n🧪 API ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print(f"  - Τρέχον Αποθεματικό: {summary['current_reserve']:10.2f}€")
        print(f"  - Εισπράξεις Μήνα: {summary['total_payments_month']:10.2f}€")
        print(f"  - Δαπάνες Μήνα: {summary['total_expenses_month']:10.2f}€")
        print(f"  - Ανέκδοτες Δαπάνες: {summary['pending_expenses']:10.2f}€")
        
        # Check what the user claims to see
        user_claims = {
            'current_reserve': 20866.00,
            'pending_expenses': 5988.00,
            'total_expenses_month': 5988.00,
            'total_payments_month': 25000.00
        }
        
        print(f"\n🎯 ΣΥΓΚΡΙΣΗ ΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΤΟΥ ΧΡΗΣΤΗ:")
        print(f"  - Τρέχον Αποθεματικό:")
        print(f"    Χρήστης βλέπει: {user_claims['current_reserve']:10.2f}€")
        print(f"    Πραγματικό:     {summary['current_reserve']:10.2f}€")
        print(f"    Διαφορά:        {abs(summary['current_reserve'] - Decimal(str(user_claims['current_reserve']))):10.2f}€")
        
        print(f"  - Εισπράξεις Μήνα:")
        print(f"    Χρήστης βλέπει: {user_claims['total_payments_month']:10.2f}€")
        print(f"    Πραγματικό:     {summary['total_payments_month']:10.2f}€")
        
        print(f"  - Δαπάνες Μήνα:")
        print(f"    Χρήστης βλέπει: {user_claims['total_expenses_month']:10.2f}€")
        print(f"    Πραγματικό:     {summary['total_expenses_month']:10.2f}€")
        
        print(f"  - Ανέκδοτες Δαπάνες:")
        print(f"    Χρήστης βλέπει: {user_claims['pending_expenses']:10.2f}€")
        print(f"    Πραγματικό:     {summary['pending_expenses']:10.2f}€")
        
        # Check if there are any other buildings or data sources
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΓΙΑ ΆΛΛΕΣ ΠΗΓΕΣ ΔΕΔΟΜΕΝΩΝ:")
        
        # Check all buildings
        all_buildings = Building.objects.all()
        for b in all_buildings:
            b_payments = Payment.objects.filter(apartment__building_id=b.id)
            b_expenses = Expense.objects.filter(building_id=b.id)
            b_total_payments = b_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            b_total_expenses = b_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            b_reserve = b_total_payments - b_total_expenses
            
            print(f"  - Κτίριο {b.id} ({b.name}): {b_reserve:10.2f}€")
            
            # Check if this building has the numbers the user sees
            if b_total_payments >= 25000 or b_total_expenses >= 5988 or b_reserve >= 20000:
                print(f"    🎯 ΒΡΕΘΗΚΑΝ ΜΕΓΑΛΑ ΠΟΣΑ!")
                print(f"      Εισπράξεις: {b_total_payments:10.2f}€")
                print(f"      Δαπάνες: {b_total_expenses:10.2f}€")
                print(f"      Αποθεματικό: {b_reserve:10.2f}€")
        
        # Check if there are any pending expenses that might explain the 5988€
        pending_expenses = Expense.objects.filter(is_issued=False)
        total_pending = pending_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if total_pending > 0:
            print(f"\n📝 ΒΡΕΘΗΚΑΝ ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ:")
            for expense in pending_expenses:
                print(f"  - {expense.title}: {expense.amount:8.2f}€ ({expense.date})")
        
        print(f"\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    debug_user_view()
