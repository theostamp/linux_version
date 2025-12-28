#!/usr/bin/env python
"""
Quick test for monthly notification financial calculations
"""
import os
import sys
import django
from datetime import date

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

with schema_context('demo'):
    from buildings.models import Building
    from apartments.models import Apartment
    from financial.models import CommonExpensePeriod, ApartmentShare, Transaction
    from notifications.services import MonthlyTaskService

    print("=" * 80)
    print("MONTHLY NOTIFICATIONS FINANCIAL TEST")
    print("=" * 80)
    print()

    # Check data
    print("1. DATA CHECK")
    print("-" * 80)
    buildings_count = Building.objects.count()
    apartments_count = Apartment.objects.count()
    periods_count = CommonExpensePeriod.objects.count()
    shares_count = ApartmentShare.objects.count()

    print(f"Buildings: {buildings_count}")
    print(f"Apartments: {apartments_count}")
    print(f"Common Expense Periods: {periods_count}")
    print(f"Apartment Shares: {shares_count}")
    print()

    if periods_count == 0:
        print("⚠️  No CommonExpensePeriod records found!")
        print("   Monthly notifications will show 0.00€ for all apartments")
        print()
        print("ACTION NEEDED:")
        print("1. Create CommonExpensePeriod for October 2025")
        print("2. Generate ApartmentShare records for each apartment")
        print()
    else:
        # Show sample periods
        print("Sample Periods:")
        for period in CommonExpensePeriod.objects.all()[:3]:
            print(f"  - {period.period_name}: {period.start_date} to {period.end_date}")
            print(f"    Building: {period.building.name or period.building.street}")
            print(f"    Shares: {period.apartment_shares.count()}")
        print()

    # Test calculation
    if apartments_count > 0:
        print("2. CALCULATION TEST")
        print("-" * 80)
        test_apartment = Apartment.objects.first()
        test_period = date(2025, 10, 1)

        print(f"Testing apartment: {test_apartment.number}")
        print(f"Building: {test_apartment.building.name or test_apartment.building.street}")
        print(f"Period: {test_period.strftime('%m/%Y')}")
        print()

        # Test common expense
        common_expense = MonthlyTaskService._calculate_common_expense(
            test_apartment,
            test_period
        )
        print(f"Common Expense: {common_expense:.2f}€")

        # Test previous balance
        previous_balance = MonthlyTaskService._calculate_previous_balance(
            test_apartment,
            test_period
        )
        print(f"Previous Balance: {previous_balance:.2f}€")
        print(f"Total Due: {(common_expense + previous_balance):.2f}€")
        print()

    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
