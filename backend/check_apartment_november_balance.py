#!/usr/bin/env python3
"""
Έλεγχος υπολοίπου διαμερίσματος 10 για Νοέμβριο.
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

def check_apartment_balance():
    """Ελέγχει το υπόλοιπο διαμερίσματος 10"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΥΠΟΛΟΙΠΟΥ ΔΙΑΜΕΡΙΣΜΑΤΟΣ 10 - ΝΟΕΜΒΡΙΟΣ 2025")
        print("="*80 + "\n")
        
        # Διαμέρισμα 10
        apartment = Apartment.objects.filter(number='10').first()
        
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print(f"   Ιδιοκτήτης: {apartment.owner_name}")
        print(f"   Χιλιοστά: {apartment.participation_mills}\n")
        
        # === ΟΚΤΩΒΡΙΟΣ 2025 ===
        print("="*80)
        print("ΟΚΤΩΒΡΙΟΣ 2025")
        print("="*80)
        
        service = FinancialDashboardService(apartment.building_id)
        oct_balances = service.get_apartment_balances(month='2025-10')
        
        apt_10_oct = next((apt for apt in oct_balances if apt['apartment_number'] == '10'), None)
        
        if apt_10_oct:
            print(f"   Previous Balance: €{apt_10_oct.get('previous_balance', 0)}")
            print(f"   Resident Expenses: €{apt_10_oct.get('resident_expenses', 0)}")
            print(f"   Owner Expenses: €{apt_10_oct.get('owner_expenses', 0)}")
            print(f"   Expense Share: €{apt_10_oct.get('expense_share', 0)}")
            print(f"   Net Obligation: €{apt_10_oct.get('net_obligation', 0)}")
        
        # === ΝΟΕΜΒΡΙΟΣ 2025 ===
        print("\n" + "="*80)
        print("ΝΟΕΜΒΡΙΟΣ 2025")
        print("="*80)
        
        nov_balances = service.get_apartment_balances(month='2025-11')
        
        apt_10_nov = next((apt for apt in nov_balances if apt['apartment_number'] == '10'), None)
        
        if apt_10_nov:
            print(f"   Previous Balance: €{apt_10_nov.get('previous_balance', 0)}")
            print(f"   Resident Expenses: €{apt_10_nov.get('resident_expenses', 0)}")
            print(f"   Owner Expenses: €{apt_10_nov.get('owner_expenses', 0)}")
            print(f"   Expense Share: €{apt_10_nov.get('expense_share', 0)}")
            print(f"   Net Obligation: €{apt_10_nov.get('net_obligation', 0)}")
        
        # === ΑΝΑΛΥΣΗ ===
        print("\n" + "="*80)
        print("ΑΝΑΛΥΣΗ")
        print("="*80 + "\n")
        
        if apt_10_oct and apt_10_nov:
            oct_obligation = apt_10_oct.get('net_obligation', 0)
            nov_previous = apt_10_nov.get('previous_balance', 0)
            nov_current = apt_10_nov.get('expense_share', 0)
            nov_total = apt_10_nov.get('net_obligation', 0)
            
            print(f"Οκτώβριος:")
            print(f"   Οφειλή: €{oct_obligation}")
            
            print(f"\nΝοέμβριος:")
            print(f"   Παλαιότερες Οφειλές (από Οκτώβριο): €{nov_previous}")
            print(f"   Δαπάνες Νοεμβρίου: €{nov_current}")
            print(f"   Συνολική Οφειλή: €{nov_total}")
            
            expected_total = oct_obligation + nov_current
            print(f"\n✅ Αναμενόμενη Συνολική Οφειλή: €{expected_total}")
            print(f"📊 Πραγματική Συνολική Οφειλή: €{nov_total}")
            
            if abs(expected_total - nov_total) < 0.01:
                print(f"\n✅ ΣΩΣΤΟ! Οι οφειλές μεταφέρονται σωστά!")
            else:
                print(f"\n❌ ΛΑΘΟΣ! Διαφορά: €{expected_total - nov_total}")
                print(f"   Οι παλαιότερες οφειλές ΔΕΝ μεταφέρονται σωστά!")
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    check_apartment_balance()

