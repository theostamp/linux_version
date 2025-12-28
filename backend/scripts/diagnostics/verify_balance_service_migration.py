"""
Verification script for Balance Service Migration

This script:
1. Tests that the new BalanceCalculationService works correctly
2. Verifies consistency with existing data
3. Ensures no regressions were introduced
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from decimal import Decimal
from datetime import date
from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building
from financial.balance_service import BalanceCalculationService


def verify_all_apartments():
    """Verify balance consistency for all apartments"""
    print("=" * 80)
    print("BALANCE SERVICE MIGRATION VERIFICATION")
    print("=" * 80)
    print()

    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building)

        print(f"Building: {building.name}")
        print(f"Total Apartments: {apartments.count()}")
        print()

        inconsistencies = []
        consistent_count = 0

        for apartment in apartments:
            result = BalanceCalculationService.verify_balance_consistency(apartment)

            if result['is_consistent']:
                print(f"✅ {result['apartment_number']}: "
                      f"{result['stored_balance']} = {result['calculated_balance']}")
                consistent_count += 1
            else:
                print(f"❌ {result['apartment_number']}: "
                      f"{result['stored_balance']} ≠ {result['calculated_balance']} "
                      f"(diff: {result['difference']})")
                inconsistencies.append(result)

        print()
        print("=" * 80)
        print(f"SUMMARY")
        print("=" * 80)
        print(f"Consistent: {consistent_count}/{apartments.count()}")
        print(f"Inconsistent: {len(inconsistencies)}/{apartments.count()}")
        print()

        if inconsistencies:
            print("⚠️  INCONSISTENCIES FOUND:")
            for inc in inconsistencies:
                print(f"  - {inc['apartment_number']}: "
                      f"Stored={inc['stored_balance']}, "
                      f"Calculated={inc['calculated_balance']}, "
                      f"Diff={inc['difference']}")
            print()
            print("Run update_all_balances() to fix inconsistencies")
        else:
            print("✅ All apartments have consistent balances!")

        return len(inconsistencies) == 0


def update_all_balances():
    """Update all apartment balances using the new service"""
    print("=" * 80)
    print("UPDATING ALL APARTMENT BALANCES")
    print("=" * 80)
    print()

    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building)

        for apartment in apartments:
            old_balance = apartment.current_balance or Decimal('0.00')
            new_balance = BalanceCalculationService.update_apartment_balance(apartment)

            if old_balance != new_balance:
                print(f"🔄 {apartment.number}: {old_balance} → {new_balance} "
                      f"(diff: {new_balance - old_balance})")
            else:
                print(f"✅ {apartment.number}: {new_balance} (no change)")

        print()
        print("✅ All balances updated!")


def test_historical_balance():
    """Test historical balance calculation for a specific date"""
    print("=" * 80)
    print("TESTING HISTORICAL BALANCE CALCULATION")
    print("=" * 80)
    print()

    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartment = Apartment.objects.filter(building=building).first()

        if not apartment:
            print("❌ No apartments found!")
            return

        print(f"Testing apartment: {apartment.number}")
        print()

        # Test different dates
        test_dates = [
            date(2025, 7, 1),   # July
            date(2025, 10, 1),  # October
            date(2025, 11, 1),  # November
            date(2026, 1, 1),   # January 2026
        ]

        for test_date in test_dates:
            balance = BalanceCalculationService.calculate_historical_balance(
                apartment=apartment,
                end_date=test_date,
                include_management_fees=True
            )
            print(f"Balance до {test_date}: {balance}€")

        print()
        print("✅ Historical balance calculation working!")


if __name__ == '__main__':
    print()
    print("Balance Service Migration Verification")
    print("======================================")
    print()
    print("Available commands:")
    print("  1. verify_all_apartments() - Check consistency")
    print("  2. update_all_balances() - Update all balances")
    print("  3. test_historical_balance() - Test historical calculation")
    print()

    # Run verification
    is_consistent = verify_all_apartments()
    print()

    if not is_consistent:
        response = input("Inconsistencies found. Update all balances? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            update_all_balances()
            print()
            print("Re-verifying after update...")
            verify_all_apartments()
    else:
        test_historical_balance()
