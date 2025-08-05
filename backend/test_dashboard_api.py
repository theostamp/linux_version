#!/usr/bin/env python3
"""
Test script για το dashboard API
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from financial.services import FinancialDashboardService
from tenants.models import Client

def test_dashboard_api():
    """Test το dashboard API"""
    try:
        # Βρες το demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {tenant.name} (schema: {tenant.schema_name})")
        
        # Ελέγχος στο tenant context
        with tenant_context(tenant):
            # Test για building 1
            service = FinancialDashboardService(1)
            summary = service.get_summary()
            
            print("\n📊 Dashboard Summary:")
            print(f"  - Τρέχον Αποθεματικό: {summary['current_reserve']}€")
            print(f"  - Συνολικές Οφειλές: {summary['total_obligations']}€")
            print(f"  - Δαπάνες Μήνα: {summary['total_expenses_this_month']}€")
            print(f"  - Εισπράξεις Μήνα: {summary['total_payments_this_month']}€")
            print(f"  - Πρόσφατες Κινήσεις: {len(summary['recent_transactions'])}")
            print(f"  - Διαμερίσματα: {len(summary['apartment_balances'])}")
            
            # Ελέγχος apartment balances
            if summary['apartment_balances']:
                print("\n🏢 Κατάσταση Διαμερισμάτων:")
                for apt in summary['apartment_balances'][:3]:  # Πρώτα 3
                    print(f"  - {apt['number']}: {apt['current_balance']}€ (ιδιοκτήτης: {apt['owner_name']})")
            
            # Ελέγχος recent transactions
            if summary['recent_transactions']:
                print("\n💳 Πρόσφατες Κινήσεις:")
                for tx in summary['recent_transactions'][:3]:  # Πρώτα 3
                    print(f"  - {tx.type}: {tx.amount}€ ({tx.date})")
            
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_api() 