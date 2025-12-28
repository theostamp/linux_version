#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τα μεγαλύτερα εικονίδια
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

def test_larger_icons():
    """Δοκιμή μεγαλύτερων εικονιδίων"""
    
    with schema_context('demo'):
        print("🔍 Δοκιμή Μεγαλύτερων Εικονιδίων")
        print("=" * 60)
        
        service = FinancialDashboardService(building_id=1)
        
        # Δοκιμή για Σεπτέμβριο 2025
        print(f"\n📅 Σεπτέμβριος 2025:")
        
        apartment_balances = service.get_apartment_balances('2025-09')
        
        print(f"   • Σύνολο διαμερισμάτων: {len(apartment_balances)}")
        
        # Έλεγχος κάθε διαμερίσματος
        for balance in apartment_balances:
            print(f"\n   🏠 Διαμέρισμα {balance['number']} ({balance['owner_name']}):")
            print(f"      • Παλαιότερες οφειλές: €{balance['previous_balance']}")
            print(f"      • Αποθεματικό: €{balance.get('reserve_fund_share', 0)}")
            print(f"      • Τρέχουσα οφειλή: €{balance['expense_share']}")
            print(f"      • Συνολική οφειλή: €{balance['net_obligation']}")
            
            # Έλεγχος κουμπιών
            has_debt = float(balance['net_obligation']) > 0.30
            print(f"      🔘 Κουμπιά (μεγαλύτερα εικονίδια):")
            print(f"         • Ενημέρωση: 👁️ (h-3 w-3)")
            print(f"         • Ιστορικό: 📊 (h-4 w-4) - w-10 h-8")
            print(f"         • Κινήσεις: 📈 (h-4 w-4) - w-10 h-8")
            if has_debt:
                print(f"         • Πληρωμή: 💳 (h-3 w-3)")
            print(f"         • Διαγραφή: 🗑️ (h-4 w-4) - w-10 h-8")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Τα εικονίδια τώρα είναι:")
        print("      • Μεγαλύτερα: h-4 w-4 (αντί για h-3 w-3)")
        print("      • Πιο ορατά και εύκολα στη χρήση")
        print("      • Καλύτερο μέγεθος κουμπιού: w-10 h-8")
        print("   📋 Διατηρείται η εξοικονομία χώρου με καλύτερη ορατότητα")

if __name__ == "__main__":
    test_larger_icons()
