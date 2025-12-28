#!/usr/bin/env python3
"""
Script για δημιουργία management fees για όλους τους μήνες από Οκτώβριο 2025
"""
import os
import django
from datetime import date
from calendar import monthrange

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from decimal import Decimal

def create_management_fees_for_month(building, year, month):
    """Δημιουργεί management fees για έναν μήνα"""
    # Check if already exists
    existing = Expense.objects.filter(
        building=building,
        category='management_fees',
        date__year=year,
        date__month=month
    ).exists()

    if existing:
        print(f"⏭️ Management fees already exist for {month:02d}/{year}")
        return False

    # Last day of month
    _, last_day_num = monthrange(year, month)
    last_day = date(year, month, last_day_num)

    # Calculate total amount
    apartments_count = Apartment.objects.filter(building=building).count()
    management_fee = building.management_fee_per_apartment or Decimal('8.00')
    total_amount = management_fee * apartments_count

    # Create expense
    expense = Expense.objects.create(
        building=building,
        title=f'Διαχειριστικά Έξοδα {date(year, month, 1).strftime("%B %Y")}',
        amount=total_amount,
        date=last_day,
        category='management_fees',
        description=f'Διαχειριστικά Έξοδα {date(year, month, 1).strftime("%B %Y")}',
        distribution_type='equal_share',
        payer_responsibility='resident',
        approved=True
    )

    print(f"✅ Created management fees for {month:02d}/{year}: €{total_amount}")
    return True

def main():
    # Get building 1
    try:
        building = Building.objects.get(id=1)
    except Building.DoesNotExist:
        print("❌ Building 1 not found")
        return

    print(f"🏢 Building: {building.name}")
    print(f"💰 Management fee per apartment: €{building.management_fee_per_apartment or 8}")

    # Create management fees from October 2025 to current month
    start_year, start_month = 2025, 10
    today = date.today()
    end_year, end_month = today.year, today.month

    current_year, current_month = start_year, start_month
    created_count = 0

    while (current_year < end_year) or (current_year == end_year and current_month <= end_month):
        # Check if month is after financial_system_start_date
        if building.financial_system_start_date:
            month_start = date(current_year, current_month, 1)
            if month_start < building.financial_system_start_date:
                print(f"⏭️ Skipping {current_month:02d}/{current_year} - before financial_system_start_date")
                # Next month
                if current_month == 12:
                    current_year += 1
                    current_month = 1
                else:
                    current_month += 1
                continue

        if create_management_fees_for_month(building, current_year, current_month):
            created_count += 1

        # Next month
        if current_month == 12:
            current_year += 1
            current_month = 1
        else:
            current_month += 1

    print(f"\n✅ Completed: {created_count} management fees created")

if __name__ == '__main__':
    main()
