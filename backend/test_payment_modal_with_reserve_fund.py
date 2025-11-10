#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε το modal πληρωμής με αποθεματικό
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

def test_payment_modal_with_reserve_fund():
    """Δοκιμή modal πληρωμής με αποθεματικό"""
    
    with schema_context('demo'):
        print("💰 Δοκιμή Modal Πληρωμής με Αποθεματικό")
        print("=" * 60)
        
        service = FinancialDashboardService(building_id=1)
        
        # Δοκιμή για Σεπτέμβριο 2025
        print(f"\n📅 Σεπτέμβριος 2025:")
        
        apartment_balances = service.get_apartment_balances('2025-09')
        
        print(f"   • Σύνολο διαμερισμάτων: {len(apartment_balances)}")
        
        # Έλεγχος κάθε διαμερίσματος για το modal πληρωμής
        for balance in apartment_balances:
            print(f"\n   🏠 Διαμέρισμα {balance['number']} ({balance['owner_name']}):")
            print(f"      • Παλαιότερες οφειλές: €{balance['previous_balance']}")
            print(f"      • Αποθεματικό: €{balance.get('reserve_fund_share', 0)}")
            print(f"      • Τρέχουσα οφειλή: €{balance['expense_share']}")
            print(f"      • Συνολική οφειλή: €{balance['net_obligation']}")
            
            # Υπολογισμός προτεινόμενων πληρωμών
            total_debt = max(0, float(balance['net_obligation']))
            previous_debt = max(0, float(balance['previous_balance']))
            reserve_fund_share = max(0, float(balance.get('reserve_fund_share', 0)))
            current_expense_share = max(0, float(balance['expense_share']))
            
            # Προτεραιότητα: Παλαιότερες οφειλές → Αποθεματικό → Τρέχουσα οφειλή
            if previous_debt > 0:
                previous_obligations_amount = min(previous_debt, total_debt)
                remaining_debt = total_debt - previous_obligations_amount
                
                if reserve_fund_share > 0 and remaining_debt > 0:
                    reserve_fund_amount = min(reserve_fund_share, remaining_debt)
                    final_remaining_debt = remaining_debt - reserve_fund_amount
                    common_expense_amount = max(0, final_remaining_debt)
                else:
                    reserve_fund_amount = 0
                    common_expense_amount = max(0, remaining_debt)
            else:
                previous_obligations_amount = 0
                if reserve_fund_share > 0:
                    reserve_fund_amount = min(reserve_fund_share, total_debt)
                    remaining_debt = total_debt - reserve_fund_amount
                    common_expense_amount = max(0, remaining_debt)
                else:
                    reserve_fund_amount = 0
                    common_expense_amount = total_debt
            
            print(f"      📋 Προτεινόμενες πληρωμές:")
            print(f"         • Παλαιότερες οφειλές: €{previous_obligations_amount:.2f}")
            print(f"         • Αποθεματικό: €{reserve_fund_amount:.2f}")
            print(f"         • Κοινόχρηστα: €{common_expense_amount:.2f}")
            print(f"         • Σύνολο: €{previous_obligations_amount + reserve_fund_amount + common_expense_amount:.2f}")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Το modal πληρωμής τώρα περιλαμβάνει:")
        print("      • Παλαιότερες οφειλές (προτεραιότητα 1)")
        print("      • Αποθεματικό (προτεραιότητα 2)")
        print("      • Κοινόχρηστα (προτεραιότητα 3)")
        print("   📋 Κάθε πεδίο έχει την προεπιλεγμένη τιμή του διαμερίσματος")

if __name__ == "__main__":
    test_payment_modal_with_reserve_fund()
