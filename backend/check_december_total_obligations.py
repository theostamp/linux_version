#!/usr/bin/env python3
"""
Έλεγχος συνολικών οφειλών Δεκεμβρίου 2025
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
from apartments.models import Apartment

def check_december_total():
    """Ελέγχει τις συνολικές οφειλές Δεκεμβρίου"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΩΝ ΟΦΕΙΛΩΝ - ΔΕΚΕΜΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        service = FinancialDashboardService(1)  # Building ID = 1
        
        # === ΟΚΤΩΒΡΙΟΣ 2025 ===
        print("="*80)
        print("ΟΚΤΩΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        oct_summary = service.get_summary(month='2025-10')
        oct_balances = service.get_apartment_balances(month='2025-10')
        
        oct_total_obligations = sum(apt.get('net_obligation', 0) for apt in oct_balances)
        
        print(f"📊 Summary API:")
        print(f"   Previous Obligations: €{oct_summary.get('previous_obligations', 0)}")
        print(f"   Current Obligations: €{oct_summary.get('current_obligations', 0)}")
        print(f"   Total Balance: €{oct_summary.get('total_balance', 0)}")
        
        print(f"\n📋 Apartment Balances:")
        print(f"   Total Net Obligations (Σύνολο Οφειλών): €{oct_total_obligations}")
        
        # === ΝΟΕΜΒΡΙΟΣ 2025 ===
        print("\n" + "="*80)
        print("ΝΟΕΜΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        nov_summary = service.get_summary(month='2025-11')
        nov_balances = service.get_apartment_balances(month='2025-11')
        
        nov_total_obligations = sum(apt.get('net_obligation', 0) for apt in nov_balances)
        
        print(f"📊 Summary API:")
        print(f"   Previous Obligations: €{nov_summary.get('previous_obligations', 0)}")
        print(f"   Current Obligations: €{nov_summary.get('current_obligations', 0)}")
        print(f"   Total Balance: €{nov_summary.get('total_balance', 0)}")
        
        print(f"\n📋 Apartment Balances:")
        print(f"   Total Net Obligations (Σύνολο Οφειλών): €{nov_total_obligations}")
        
        # === ΔΕΚΕΜΒΡΙΟΣ 2025 ===
        print("\n" + "="*80)
        print("ΔΕΚΕΜΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        dec_summary = service.get_summary(month='2025-12')
        dec_balances = service.get_apartment_balances(month='2025-12')
        
        dec_total_obligations = sum(apt.get('net_obligation', 0) for apt in dec_balances)
        
        print(f"📊 Summary API:")
        print(f"   Previous Obligations: €{dec_summary.get('previous_obligations', 0)}")
        print(f"   Current Obligations: €{dec_summary.get('current_obligations', 0)}")
        print(f"   Total Balance: €{dec_summary.get('total_balance', 0)}")
        
        print(f"\n📋 Apartment Balances (Καρτέλα Διαμερισμάτων):")
        print(f"   Total Net Obligations (Άθροισμα Συνολικών Οφειλών): €{dec_total_obligations:.2f}")
        
        # Ανάλυση ανά διαμέρισμα
        print(f"\n📋 Αναλυτικά Διαμερίσματα:")
        for apt in sorted(dec_balances, key=lambda x: x['apartment_number']):
            print(f"   Διαμ. {apt['apartment_number']:>2}: "
                  f"Resident: €{apt.get('resident_expenses', 0):>7.2f} | "
                  f"Owner: €{apt.get('owner_expenses', 0):>7.2f} | "
                  f"Previous: €{apt.get('previous_balance', 0):>7.2f} | "
                  f"Net Obligation: €{apt.get('net_obligation', 0):>7.2f}")
        
        # === ΣΥΓΚΡΙΣΗ ===
        print("\n" + "="*80)
        print("ΣΥΓΚΡΙΣΗ")
        print("="*80 + "\n")
        
        print(f"Δεκέμβριος 2025:")
        print(f"   Summary API - Previous Obligations: €{dec_summary.get('previous_obligations', 0):.2f}")
        print(f"   Summary API - Current Obligations: €{dec_summary.get('current_obligations', 0):.2f}")
        print(f"   Summary API - TOTAL: €{dec_summary.get('previous_obligations', 0) + dec_summary.get('current_obligations', 0):.2f}")
        print(f"\n   Apartment Balances - TOTAL: €{dec_total_obligations:.2f}")
        
        diff = dec_total_obligations - (dec_summary.get('previous_obligations', 0) + dec_summary.get('current_obligations', 0))
        
        if abs(diff) < 0.01:
            print(f"\n✅ ΣΩΣΤΟ! Τα ποσά ταιριάζουν!")
        else:
            print(f"\n❌ ΛΑΘΟΣ! Διαφορά: €{diff:.2f}")
            print(f"   Το Summary API λείπουν παλαιότερες οφειλές!")
        
        # Υπολογισμός αναμενόμενων παλαιότερων οφειλών
        expected_previous = oct_total_obligations + nov_total_obligations
        actual_previous = dec_summary.get('previous_obligations', 0)
        
        print(f"\nΑναμενόμενες Παλαιότερες Οφειλές:")
        print(f"   Οκτώβριος: €{oct_total_obligations:.2f}")
        print(f"   Νοέμβριος: €{nov_total_obligations:.2f}")
        print(f"   ΑΘΡΟΙΣΜΑ: €{expected_previous:.2f}")
        print(f"\n   Πραγματικές (API): €{actual_previous:.2f}")
        
        if abs(expected_previous - actual_previous) > 0.01:
            print(f"\n❌ ΠΡΟΒΛΗΜΑ! Λείπουν: €{expected_previous - actual_previous:.2f}")
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    check_december_total()

