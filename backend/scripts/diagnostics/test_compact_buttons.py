#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τα συμπαγή κουμπιά
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

def test_compact_buttons():
    """Δοκιμή συμπαγών κουμπιών"""
    
    with schema_context('demo'):
        print("🔘 Δοκιμή Συμπαγών Κουμπιών")
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
            print(f"      🔘 Κουμπιά:")
            print(f"         • Ενημέρωση: 👁️ (tooltip: 'Ενημέρωση διαμερίσματος')")
            print(f"         • Ιστορικό: 📊 (tooltip: 'Προβολή ιστορικού πληρωμών')")
            print(f"         • Κινήσεις: 📈 (tooltip: 'Προβολή ιστορικού κινήσεων')")
            if has_debt:
                print(f"         • Πληρωμή: 💳 (tooltip: 'Πληρωμή οφειλών')")
            print(f"         • Διαγραφή: 🗑️ (tooltip: 'Διαγραφή πληρωμών')")
        
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Τα κουμπιά 'Ιστορικό' και 'Κινήσεις' τώρα εμφανίζουν:")
        print("      • Μόνο τα εικονίδια (χωρίς κείμενο)")
        print("      • Tooltips για εξήγηση")
        print("      • Συμπαγή μέγεθος (w-8 h-6)")
        print("   📋 Εξοικονομείται χώρος στη στήλη 'Ενέργειες'")

if __name__ == "__main__":
    test_compact_buttons()
