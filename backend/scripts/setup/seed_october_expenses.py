#!/usr/bin/env python
"""
Seed script to create October 2025 common expenses for demo building.
This will populate data so monthly notification system can be tested.
"""
import os
import sys
import django
from datetime import date
from decimal import Decimal

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

with schema_context('demo'):
    from buildings.models import Building
    from apartments.models import Apartment
    from financial.models import CommonExpensePeriod, ApartmentShare

    print("=" * 80)
    print("SEED OCTOBER 2025 COMMON EXPENSES")
    print("=" * 80)
    print()

    # Get demo building
    building = Building.objects.first()
    if not building:
        print("❌ ERROR: No building found!")
        sys.exit(1)

    print(f"Building: {building.name or building.street}")
    print(f"Apartments: {building.apartments.count()}")
    print()

    # Check if period already exists
    existing_period = CommonExpensePeriod.objects.filter(
        building=building,
        start_date=date(2025, 10, 1)
    ).first()

    if existing_period:
        print(f"⚠️  Period already exists: {existing_period.period_name}")
        print(f"   Shares: {existing_period.apartment_shares.count()}")
        response = input("\nDelete and recreate? (yes/no): ")
        if response.lower() == 'yes':
            print(f"Deleting existing period and {existing_period.apartment_shares.count()} shares...")
            existing_period.delete()
        else:
            print("Aborting.")
            sys.exit(0)

    # Create October 2025 period
    print("\n1. Creating CommonExpensePeriod...")
    print("-" * 80)
    period = CommonExpensePeriod.objects.create(
        building=building,
        period_name="Οκτώβριος 2025",
        start_date=date(2025, 10, 1),
        end_date=date(2025, 10, 31),
        is_active=True
    )
    print(f"✅ Created: {period.period_name}")
    print(f"   Period: {period.start_date} to {period.end_date}")
    print()

    # Create ApartmentShares for each apartment
    print("2. Creating ApartmentShares...")
    print("-" * 80)

    apartments = building.apartments.all()
    if apartments.count() == 0:
        print("❌ ERROR: No apartments found!")
        period.delete()
        sys.exit(1)

    total_mills = sum(apt.participation_mills or 0 for apt in apartments)
    if total_mills == 0:
        print("⚠️  WARNING: Total participation mills = 0")
        print("   Using equal distribution instead")
        total_mills = apartments.count() * 100  # Fallback

    # Calculate total building expense
    # Base expenses for typical Greek building
    base_monthly_expense = Decimal('1200.00')  # Total building expenses

    print(f"Total building expense: {base_monthly_expense}€")
    print(f"Total participation mills: {total_mills}")
    print()

    shares_created = 0
    for apartment in apartments:
        # Calculate apartment's share based on participation mills
        mills = apartment.participation_mills or 100
        apartment_share = (Decimal(mills) / Decimal(total_mills)) * base_monthly_expense

        # Get previous balance from apartment model (if available)
        previous_balance = apartment.previous_balance or Decimal('0.00')

        # Total due = current month + previous balance
        total_due = apartment_share + previous_balance

        # Create share
        share = ApartmentShare.objects.create(
            period=period,
            apartment=apartment,
            total_amount=apartment_share,
            previous_balance=previous_balance,
            total_due=total_due,
            breakdown={
                'common_expenses': float(apartment_share),
                'previous_balance': float(previous_balance),
                'total_due': float(total_due),
                'participation_mills': mills,
                'calculation_method': 'participation_mills'
            }
        )

        shares_created += 1
        print(f"  {apartment.number:4s} | Mills: {mills:4d} | "
              f"Share: {apartment_share:7.2f}€ | "
              f"Prev: {previous_balance:6.2f}€ | "
              f"Total: {total_due:7.2f}€")

    print()
    print(f"✅ Created {shares_created} apartment shares")
    print()

    # Verification
    print("3. VERIFICATION")
    print("-" * 80)
    total_distributed = sum(
        share.total_amount for share in period.apartment_shares.all()
    )
    print(f"Building expense: {base_monthly_expense:.2f}€")
    print(f"Total distributed: {total_distributed:.2f}€")
    print(f"Difference: {abs(base_monthly_expense - total_distributed):.2f}€")
    print()

    if abs(base_monthly_expense - total_distributed) < Decimal('0.10'):
        print("✅ Distribution correct!")
    else:
        print("⚠️  Small rounding difference (acceptable)")

    print()
    print("=" * 80)
    print("SEED COMPLETE")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Run: python /app/test_monthly_notifications.py")
    print("2. Test monthly notification generation")
    print("3. Check that emails show correct amounts per apartment")
