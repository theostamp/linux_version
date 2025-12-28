#!/usr/bin/env python
"""
Comprehensive test: Επαλήθευση μεταφοράς υπολοίπων για όλους τους τύπους δαπανών
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from apartments.models import Apartment
from buildings.models import Building

def test_all_balance_transfers():
    """Test για όλους τους τύπους δαπανών"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("COMPREHENSIVE TEST: ΜΕΤΑΦΟΡΑ ΥΠΟΛΟΙΠΩΝ")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}\n")

        # Παίρνουμε το πρώτο διαμέρισμα
        apartment = Apartment.objects.filter(building=building).first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα")
            return

        print(f"📍 Διαμέρισμα: {apartment.number}\n")

        # Test για διάφορους μήνες
        test_months = [
            ('2025-10', 'Οκτώβριος 2025', {
                'expected_previous': Decimal('0.00'),
                'expected_current_min': Decimal('95.00'),  # Προκαταβολή + Management
                'has_projects': True,
                'has_management': True
            }),
            ('2025-11', 'Νοέμβριος 2025', {
                'expected_previous_min': Decimal('95.00'),  # Προκ. + Mgmt από 10ο
                'expected_current_min': Decimal('95.00'),  # Δόση 1 + Management
                'has_projects': True,
                'has_management': True
            }),
            ('2025-12', 'Δεκέμβριος 2025', {
                'expected_previous_min': Decimal('190.00'),  # Προκ. + Δόση1 + Mgmt*2
                'expected_current_min': Decimal('95.00'),  # Δόση 2 + Management
                'has_projects': True,
                'has_management': True
            }),
        ]

        print("="*80)
        print("ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("="*80 + "\n")

        all_passed = True

        for month, description, expectations in test_months:
            print(f"{'─'*80}")
            print(f"📅 {description}")
            print(f"{'─'*80}\n")

            service = FinancialDashboardService(building.id)
            apartment_balances = service.get_apartment_balances(month)

            apt_data = next((b for b in apartment_balances if b['id'] == apartment.id), None)

            if not apt_data:
                print(f"   ❌ FAILED: Δεν βρέθηκαν δεδομένα")
                all_passed = False
                continue

            previous_balance = Decimal(str(apt_data.get('previous_balance', 0)))
            expense_share = Decimal(str(apt_data.get('expense_share', 0)))
            total = previous_balance + expense_share

            print(f"   Παλιές Οφειλές: €{previous_balance:.2f}")
            print(f"   Δαπάνες Μήνα: €{expense_share:.2f}")
            print(f"   Σύνολο: €{total:.2f}\n")

            # Ελέγχοι
            tests_passed = 0
            tests_total = 0

            # Test 1: Previous balance
            if 'expected_previous' in expectations:
                tests_total += 1
                if abs(previous_balance - expectations['expected_previous']) < Decimal('0.01'):
                    print(f"   ✅ Previous balance: €{previous_balance:.2f} (αναμενόμενο: €{expectations['expected_previous']:.2f})")
                    tests_passed += 1
                else:
                    print(f"   ❌ Previous balance: €{previous_balance:.2f} (αναμενόμενο: €{expectations['expected_previous']:.2f})")
                    all_passed = False

            elif 'expected_previous_min' in expectations:
                tests_total += 1
                if previous_balance >= expectations['expected_previous_min']:
                    print(f"   ✅ Previous balance: €{previous_balance:.2f} (≥ €{expectations['expected_previous_min']:.2f})")
                    tests_passed += 1
                else:
                    print(f"   ❌ Previous balance: €{previous_balance:.2f} (< €{expectations['expected_previous_min']:.2f})")
                    all_passed = False

            # Test 2: Current expenses
            if 'expected_current_min' in expectations:
                tests_total += 1
                if expense_share >= expectations['expected_current_min']:
                    print(f"   ✅ Current expenses: €{expense_share:.2f} (≥ €{expectations['expected_current_min']:.2f})")
                    tests_passed += 1
                else:
                    print(f"   ❌ Current expenses: €{expense_share:.2f} (< €{expectations['expected_current_min']:.2f})")
                    all_passed = False

            # Test 3: Total should increase
            if month != '2025-10':  # Skip first month
                tests_total += 1
                if total > previous_balance:
                    print(f"   ✅ Total increases: €{total:.2f} > €{previous_balance:.2f}")
                    tests_passed += 1
                else:
                    print(f"   ❌ Total should increase!")
                    all_passed = False

            print(f"\n   Αποτέλεσμα: {tests_passed}/{tests_total} tests passed")
            print()

        print("="*80)
        if all_passed:
            print("✅ ΟΛΟΚΛΗΡΩΣΗ: ΟΛΑ ΤΑ TESTS ΕΠΙΤΥΧΗΜΕΝΑ!")
        else:
            print("❌ ΟΛΟΚΛΗΡΩΣΗ: ΥΠΑΡΧΟΥΝ ΑΠΟΤΥΧΙΕΣ")
        print("="*80 + "\n")

        return all_passed

if __name__ == '__main__':
    success = test_all_balance_transfers()
    sys.exit(0 if success else 1)
