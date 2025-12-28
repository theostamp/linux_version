#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε το αποθεματικό στα apartment balances
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

def test_reserve_fund_in_apartment_balances():
    """Δοκιμή αποθεματικού στα apartment balances"""
    
    with schema_context('demo'):
        print("💰 Δοκιμή Αποθεματικού στα Apartment Balances")
        print("=" * 60)
        
        service = FinancialDashboardService(building_id=1)
        
        # Δοκιμή για Σεπτέμβριο 2025
        print(f"\n📅 Σεπτέμβριος 2025:")
        
        apartment_balances = service.get_apartment_balances('2025-09')
        
        print(f"   • Σύνολο διαμερισμάτων: {len(apartment_balances)}")
        
        # Έλεγχος κάθε διαμερίσματος
        total_reserve_fund = 0
        for balance in apartment_balances:
            reserve_fund_share = balance.get('reserve_fund_share', 0)
            total_reserve_fund += float(reserve_fund_share)
            
            print(f"\n   🏠 Διαμέρισμα {balance['number']} ({balance['owner_name']}):")
            print(f"      • Παλαιότερες οφειλές: €{balance['previous_balance']}")
            print(f"      • Αποθεματικό: €{reserve_fund_share}")
            print(f"      • Τρέχουσα οφειλή: €{balance['expense_share']}")
            print(f"      • Συνολική οφειλή: €{balance['net_obligation']}")
        
        print(f"\n💰 Συνολικό Αποθεματικό: €{total_reserve_fund}")
        
        # Έλεγχος αν το αποθεματικό είναι σωστό
        expected_reserve_fund = 1000.0  # €1000 / 10 διαμερίσματα = €100 ανά διαμέρισμα
        if abs(total_reserve_fund - expected_reserve_fund) < 0.01:
            print(f"✅ Το αποθεματικό είναι σωστό: €{total_reserve_fund}")
        else:
            print(f"❌ Το αποθεματικό είναι λάθος: €{total_reserve_fund} (αναμενόμενο: €{expected_reserve_fund})")
        
        # Δοκιμή για Οκτώβριο 2025
        print(f"\n📅 Οκτώβριος 2025:")
        
        apartment_balances_oct = service.get_apartment_balances('2025-10')
        
        total_reserve_fund_oct = 0
        for balance in apartment_balances_oct:
            reserve_fund_share = balance.get('reserve_fund_share', 0)
            total_reserve_fund_oct += float(reserve_fund_share)
        
        print(f"   • Συνολικό Αποθεματικό: €{total_reserve_fund_oct}")
        
        # Δοκιμή για Δεκέμβριο 2025 (μετά την ολοκλήρωση)
        print(f"\n📅 Δεκέμβριος 2025 (μετά την ολοκλήρωση):")
        
        apartment_balances_dec = service.get_apartment_balances('2025-12')
        
        total_reserve_fund_dec = 0
        for balance in apartment_balances_dec:
            reserve_fund_share = balance.get('reserve_fund_share', 0)
            total_reserve_fund_dec += float(reserve_fund_share)
        
        print(f"   • Συνολικό Αποθεματικό: €{total_reserve_fund_dec}")
        
        if total_reserve_fund_dec == 0:
            print("✅ Το αποθεματικό σταματάει σωστά μετά την ολοκλήρωση")
        else:
            print("❌ Το αποθεματικό δεν σταματάει μετά την ολοκλήρωση")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Το αποθεματικό εμφανίζεται τώρα στα apartment balances")
        print("   📋 Πρέπει να εμφανίζεται και στη 'Κατάσταση Διαμερισμάτων'")

if __name__ == "__main__":
    test_reserve_fund_in_apartment_balances()
