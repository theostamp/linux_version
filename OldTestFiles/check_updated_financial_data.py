#!/usr/bin/env python3
"""
Check updated financial data after the new 25,000€ payment
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

def check_updated_financial_data():
    """Check financial data after the new 25,000€ payment"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΕΝΗΜΕΡΩΜΕΝΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    try:
        client = Client.objects.get(schema_name='demo')
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Test in demo tenant
    with tenant_context(client):
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name} (ID: {building.id})")
            
            # Get current month (August 2025)
            current_month = datetime(2025, 8, 1)
            
            # Monthly calculations
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
            
            # All-time calculations
            all_payments = Payment.objects.filter(apartment__building_id=building.id)
            all_expenses = Expense.objects.filter(building_id=building.id)
            
            total_all_payments = all_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            total_all_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Pending expenses
            pending_expenses = Expense.objects.filter(
                building_id=building.id,
                is_issued=False
            )
            total_pending_expenses = pending_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Current reserve calculation
            current_reserve = total_all_payments - total_all_expenses
            
            print("\n📊 ΜΗΝΙΑΙΑ ΣΤΟΙΧΕΙΑ (Αύγουστος 2025):")
            print(f"  - Εισπράξεις μήνα: {total_monthly_payments:10.2f}€ ({monthly_payments.count()} πληρωμές)")
            print(f"  - Δαπάνες μήνα: {total_monthly_expenses:10.2f}€ ({monthly_expenses.count()} δαπάνες)")
            print(f"  - Διαφορά μήνα: {total_monthly_payments - total_monthly_expenses:10.2f}€")
            
            print("\n📊 ΣΥΝΟΛΙΚΑ ΣΤΟΙΧΕΙΑ:")
            print(f"  - Συνολικές εισπράξεις: {total_all_payments:10.2f}€ ({all_payments.count()} πληρωμές)")
            print(f"  - Συνολικές δαπάνες: {total_all_expenses:10.2f}€ ({all_expenses.count()} δαπάνες)")
            print(f"  - Τρέχον αποθεματικό: {current_reserve:10.2f}€")
            
            print("\n📝 ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ:")
            print(f"  - Ανέκδοτες δαπάνες: {total_pending_expenses:10.2f}€ ({pending_expenses.count()} δαπάνες)")
            
            # Show recent payments
            print("\n💳 ΠΡΟΣΦΑΤΕΣ ΠΛΗΡΩΜΕΣ:")
            recent_payments = all_payments.order_by('-date')[:5]
            for payment in recent_payments:
                print(f"  - {payment.apartment.number}: {payment.amount:8.2f}€ ({payment.date}) - {payment.method}")
            
            # Test API calculation
            service = FinancialDashboardService(building.id)
            summary = service.get_summary()
            
            print("\n🧪 API ΑΠΟΤΕΛΕΣΜΑΤΑ:")
            print(f"  - Τρέχον Αποθεματικό: {summary['current_reserve']:10.2f}€")
            print(f"  - Εισπράξεις Μήνα: {summary['total_payments_month']:10.2f}€")
            print(f"  - Δαπάνες Μήνα: {summary['total_expenses_month']:10.2f}€")
            print(f"  - Ανέκδοτες Δαπάνες: {summary['pending_expenses']:10.2f}€")
            
            # Check if this matches what you see
            expected_data = {
                'current_reserve': 20866.00,
                'pending_expenses': 5988.00,
                'total_expenses_month': 5988.00,
                'total_payments_month': 25000.00
            }
            
            print("\n🎯 ΣΥΓΚΡΙΣΗ ΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΣΟΥ:")
            print("  - Τρέχον Αποθεματικό:")
            print(f"    Αναμενόμενο: {expected_data['current_reserve']:10.2f}€")
            print(f"    Πραγματικό:  {summary['current_reserve']:10.2f}€")
            if abs(summary['current_reserve'] - Decimal(str(expected_data['current_reserve']))) < Decimal('0.01'):
                print("    ✅ ΤΑΙΡΙΑΖΕΙ!")
            else:
                print("    ❌ ΔΙΑΦΟΡΕΤΙΚΟ!")
            
            print("  - Εισπράξεις Μήνα:")
            print(f"    Αναμενόμενο: {expected_data['total_payments_month']:10.2f}€")
            print(f"    Πραγματικό:  {summary['total_payments_month']:10.2f}€")
            if abs(summary['total_payments_month'] - Decimal(str(expected_data['total_payments_month']))) < Decimal('0.01'):
                print("    ✅ ΤΑΙΡΙΑΖΕΙ!")
            else:
                print("    ❌ ΔΙΑΦΟΡΕΤΙΚΟ!")
        
        print("\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    check_updated_financial_data()
