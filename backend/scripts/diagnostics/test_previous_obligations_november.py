#!/usr/bin/env python
"""
Test Previous Obligations για Νοέμβριο 2025
Ελέγχει αν τα management fees από Οκτώβριο μεταφέρονται σωστά στον Νοέμβριο
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment
from financial.services import FinancialDashboardService

def test_november_previous_obligations():
    with schema_context('demo'):
        building = Building.objects.get(id=1)

        print("=" * 80)
        print("🔍 ΕΛΕΓΧΟΣ PREVIOUS OBLIGATIONS - ΝΟΕΜΒΡΙΟΣ 2025")
        print("=" * 80)

        # Test για Οκτώβριο (month=10)
        print("\n📅 ΟΚΤΩΒΡΙΟΣ 2025 (month=10)")
        print("-" * 80)

        dashboard = FinancialDashboardService(building.id)
        summary_october = dashboard.get_summary(month='2025-10')

        print(f"Current Obligations (Οκτώβριος): €{summary_october['current_obligations']}")
        print(f"Previous Obligations (Οκτώβριος): €{summary_october['previous_obligations']}")
        print(f"Total Balance (Οκτώβριος): €{summary_october['total_balance']}")

        # Ανάλυση Οκτωβρίου - Ελέγχουμε τα management fees
        october_expenses = Expense.objects.filter(
            building_id=building.id,
            date__year=2025,
            date__month=10
        )

        print(f"\n📋 Δαπάνες Οκτωβρίου:")
        total_management_fees_october = Decimal('0.00')
        for exp in october_expenses:
            print(f"  - {exp.title}: €{exp.amount} ({exp.category})")
            if exp.category == 'management_fees':
                total_management_fees_october += exp.amount

        print(f"\n💰 Σύνολο Management Fees Οκτωβρίου: €{total_management_fees_october}")

        # Test για Νοέμβριο (month=11)
        print("\n" + "=" * 80)
        print("📅 ΝΟΕΜΒΡΙΟΣ 2025 (month=11)")
        print("-" * 80)

        summary_november = dashboard.get_summary(month='2025-11')

        print(f"Current Obligations (Νοέμβριος): €{summary_november['current_obligations']}")
        print(f"Previous Obligations (Νοέμβριος): €{summary_november['previous_obligations']}")
        print(f"Total Balance (Νοέμβριος): €{summary_november['total_balance']}")

        # Ανάλυση Νοεμβρίου - Ελέγχουμε τα management fees
        november_expenses = Expense.objects.filter(
            building_id=building.id,
            date__year=2025,
            date__month=11
        )

        print(f"\n📋 Δαπάνες Νοεμβρίου:")
        for exp in november_expenses:
            print(f"  - {exp.title}: €{exp.amount} ({exp.category})")

        # Έλεγχος αν τα Previous Obligations περιλαμβάνουν management fees
        print("\n" + "=" * 80)
        print("🧮 ΑΝΑΛΥΣΗ ΜΕΤΑΦΟΡΑΣ")
        print("=" * 80)

        # Αναμενόμενα Previous Obligations Νοεμβρίου = Current Obligations Οκτωβρίου
        expected_previous_nov = summary_october['current_obligations']
        actual_previous_nov = summary_november['previous_obligations']

        print(f"\n✅ Αναμενόμενα Previous Obligations (Νοέμβριος): €{expected_previous_nov}")
        print(f"🔍 Πραγματικά Previous Obligations (Νοέμβριος): €{actual_previous_nov}")
        print(f"❌ Διαφορά: €{expected_previous_nov - actual_previous_nov}")

        if abs(expected_previous_nov - actual_previous_nov) < 0.01:
            print("\n✅ SUCCESS: Τα management fees μεταφέρθηκαν σωστά!")
        else:
            print("\n❌ ERROR: Τα management fees ΔΕΝ μεταφέρθηκαν σωστά!")
            print(f"   Χάθηκαν €{expected_previous_nov - actual_previous_nov}")

        # Debug: Ελέγχουμε για ένα συγκεκριμένο διαμέρισμα
        print("\n" + "=" * 80)
        print("🔍 DEBUG: ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ #1")
        print("=" * 80)

        apartment = Apartment.objects.filter(building_id=building.id).first()

        # Υπολογισμός historical balance για 1 Νοεμβρίου
        month_start_nov = date(2025, 11, 1)
        historical_balance = dashboard._calculate_historical_balance(apartment, month_start_nov)

        print(f"\nΔιαμέρισμα: {apartment.number}")
        print(f"Historical Balance (πριν από 1 Νοεμβρίου): €{historical_balance}")

        # Ελέγχουμε τα management expenses για αυτό το διαμέρισμα
        system_start = building.financial_system_start_date
        management_expenses = Expense.objects.filter(
            building_id=building.id,
            category='management_fees',
            date__gte=system_start,
            date__lt=month_start_nov
        )

        print(f"\n📋 Management Fees Expenses (πριν από Νοέμβριο):")
        total_mgmt_fees_for_apt = Decimal('0.00')
        apt_count = Apartment.objects.filter(building_id=building.id).count()

        for exp in management_expenses:
            apt_share = exp.amount / apt_count
            total_mgmt_fees_for_apt += apt_share
            print(f"  - {exp.date}: €{exp.amount} → €{apt_share} per apartment")

        print(f"\n💰 Σύνολο Management Fees για διαμέρισμα {apartment.number}: €{total_mgmt_fees_for_apt}")
        print(f"🔍 Historical Balance περιλαμβάνει management fees: €{historical_balance}")

        # Ελέγχουμε αν το historical balance περιλαμβάνει τα management fees
        if total_mgmt_fees_for_apt > 0:
            if historical_balance >= total_mgmt_fees_for_apt:
                print("\n✅ Το historical balance ΠΕΡΙΛΑΜΒΑΝΕΙ management fees!")
            else:
                print("\n❌ Το historical balance ΔΕΝ ΠΕΡΙΛΑΜΒΑΝΕΙ management fees!")
                print(f"   Χάθηκαν €{total_mgmt_fees_for_apt} για αυτό το διαμέρισμα")

if __name__ == '__main__':
    test_november_previous_obligations()
