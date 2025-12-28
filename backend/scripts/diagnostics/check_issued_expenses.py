#!/usr/bin/env python3
"""
Check if common expenses have been issued for September and October
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import CommonExpensePeriod, ApartmentShare, Transaction
from buildings.models import Building

def check_issued_expenses():
    """Check if common expenses have been issued"""

    with schema_context('demo'):
        building_id = 1
        building = Building.objects.get(id=building_id)

        print("\n" + "="*80)
        print("📊 COMMON EXPENSE PERIODS CHECK")
        print("="*80)

        print(f"\n🏢 Building: {building.name}")
        print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")

        # Check for CommonExpensePeriods
        periods = CommonExpensePeriod.objects.filter(
            building_id=building_id
        ).order_by('-start_date')[:5]

        print(f"\nCommon Expense Periods Found: {periods.count()}")

        for period in periods:
            print(f"\n📅 Period: {period.period_name}")
            print(f"   Start: {period.start_date}")
            print(f"   End: {period.end_date}")
            print(f"   Status: {period.status}")
            print(f"   Total Amount: €{period.total_amount}")

            # Check apartment shares for this period
            shares_count = ApartmentShare.objects.filter(period=period).count()
            print(f"   Apartment Shares: {shares_count}")

            # Check if management fees are included
            if shares_count > 0:
                sample_share = ApartmentShare.objects.filter(period=period).first()
                breakdown = sample_share.breakdown if sample_share else {}

                # Look for management fee in breakdown
                has_management = any(
                    'διαχείριση' in str(item).lower() or 'management' in str(item).lower()
                    for item in breakdown.values() if isinstance(item, (str, dict))
                )

                print(f"   Includes Management Fees: {'Yes' if has_management else 'No'}")

                if sample_share:
                    print(f"   Sample breakdown: {sample_share.breakdown}")

        # Check for September 2025 period specifically
        print("\n" + "="*80)
        print("📊 SEPTEMBER 2025 ANALYSIS:")
        print("="*80)

        sept_periods = CommonExpensePeriod.objects.filter(
            building_id=building_id,
            start_date__lte=date(2025, 9, 30),
            end_date__gte=date(2025, 9, 1)
        )

        if sept_periods.exists():
            print("✅ September 2025 has issued common expenses")
            for period in sept_periods:
                print(f"   - {period.period_name}: €{period.total_amount}")
        else:
            print("⚠️ NO common expenses issued for September 2025!")
            print("This explains why management fees are not carried over as previous obligations.")

        # Check for October 2025 period
        print("\n📊 OCTOBER 2025 ANALYSIS:")
        print("="*80)

        oct_periods = CommonExpensePeriod.objects.filter(
            building_id=building_id,
            start_date__lte=date(2025, 10, 31),
            end_date__gte=date(2025, 10, 1)
        )

        if oct_periods.exists():
            print("✅ October 2025 has issued common expenses")
            for period in oct_periods:
                print(f"   - {period.period_name}: €{period.total_amount}")
        else:
            print("⚠️ NO common expenses issued for October 2025!")

        # Summary
        print("\n" + "="*80)
        print("📊 SUMMARY:")
        print("="*80)

        if not sept_periods.exists() and not oct_periods.exists():
            print("\n⚠️ CRITICAL ISSUE FOUND!")
            print("\nCommon expenses have NOT been issued for September or October 2025.")
            print("This means:")
            print("1. Management fees are calculated but not stored as transactions")
            print("2. They appear in the current month view but don't create debts")
            print("3. They won't carry over to the next month as previous obligations")
            print("\n✅ SOLUTION:")
            print("Common expenses need to be ISSUED (not just calculated) to create transactions.")
            print("This will ensure management fees are properly tracked and carried forward.")
        else:
            print("\n✅ Common expenses have been issued.")
            print("Check if management fees are included in the breakdown.")

if __name__ == '__main__':
    check_issued_expenses()