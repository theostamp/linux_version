#!/usr/bin/env python
"""
Script to check management fees in the database
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/home/theo/project/linux_version/backend')
os.environ.setdefault('DJANGO_ENVIRONMENT', 'development')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment
from datetime import date, datetime
from decimal import Decimal

print("=" * 80)
print("MANAGEMENT FEES ANALYSIS")
print("=" * 80)

with schema_context('demo'):
    # 1. Check Building settings
    print("\n1. BUILDING CONFIGURATION")
    print("-" * 80)
    buildings = Building.objects.all()
    for building in buildings:
        print(f"\n🏢 Building: {building.name} (ID: {building.id})")
        print(f"   Management Fee per Apartment: {building.management_fee_per_apartment}€")
        print(f"   Financial System Start Date: {building.financial_system_start_date}")
        print(f"   Apartments Count: {Apartment.objects.filter(building=building).count()}")

    # 2. Check existing management fees
    print("\n\n2. EXISTING MANAGEMENT FEES")
    print("-" * 80)
    mgmt_fees = Expense.objects.filter(category='management_fees').order_by('date')

    if not mgmt_fees.exists():
        print("⚠️  NO MANAGEMENT FEES FOUND!")
    else:
        print(f"Total management fees found: {mgmt_fees.count()}\n")
        for fee in mgmt_fees:
            day_type = "✅ 1η" if fee.date.day == 1 else f"❌ Ημέρα {fee.date.day}"
            print(f"  {fee.date} | {fee.building.name} | {fee.amount}€ | {day_type}")
            print(f"     expense_type: {fee.expense_type}")
            print(f"     distribution_type: {fee.distribution_type}")
            print(f"     title: {fee.title}")

    # 3. Check if management fees have transactions
    print("\n\n3. MANAGEMENT FEES TRANSACTIONS")
    print("-" * 80)
    for fee in mgmt_fees:
        transactions = Transaction.objects.filter(
            reference_type='expense',
            reference_id=str(fee.id)
        )
        print(f"\n  Expense {fee.id} ({fee.date}):")
        print(f"     Transactions count: {transactions.count()}")
        if transactions.exists():
            for tx in transactions[:3]:  # Show first 3
                print(f"       - Apartment {tx.apartment.number}: {tx.amount}€ ({tx.type})")

    # 4. Check October 2025 specifically
    print("\n\n4. OCTOBER 2025 CHECK")
    print("-" * 80)
    oct_expenses = Expense.objects.filter(
        date__year=2025,
        date__month=10
    ).order_by('date')

    print(f"Total expenses in October 2025: {oct_expenses.count()}")
    for exp in oct_expenses:
        print(f"  {exp.date} | {exp.category} | {exp.title or 'No title'} | {exp.amount}€")

    # 5. Check a specific apartment's balance calculation
    print("\n\n5. SAMPLE APARTMENT BALANCE ANALYSIS")
    print("-" * 80)
    sample_apt = Apartment.objects.first()
    if sample_apt:
        print(f"\n🏠 Apartment: {sample_apt.number}")
        print(f"   Current Balance: {sample_apt.current_balance}€")

        # Check transactions
        all_transactions = Transaction.objects.filter(
            apartment=sample_apt
        ).order_by('date')
        print(f"   Total Transactions: {all_transactions.count()}")

        # Check management fee transactions
        mgmt_tx = all_transactions.filter(
            reference_type='expense',
            reference_id__in=[str(fee.id) for fee in mgmt_fees]
        )
        print(f"   Management Fee Transactions: {mgmt_tx.count()}")

        if mgmt_tx.exists():
            print("\n   Management Fee Transactions Detail:")
            for tx in mgmt_tx:
                print(f"      {tx.date} | {tx.type} | {tx.amount}€ | Ref: {tx.reference_id}")

    # 6. Check how balance_service sees management fees
    print("\n\n6. BALANCE SERVICE PERSPECTIVE")
    print("-" * 80)
    from financial.balance_service import BalanceCalculationService

    if sample_apt:
        # Check for November 2025
        month_start = date(2025, 11, 1)
        print(f"\nCalculating historical balance for {sample_apt.number} at {month_start}:")

        # Check what expenses are "before" November
        system_start = sample_apt.building.financial_system_start_date or date(2024, 1, 1)
        expenses_before = Expense.objects.filter(
            building_id=sample_apt.building_id,
            category='management_fees',
            date__gte=system_start,
            date__lt=month_start
        )

        print(f"   Management fees before {month_start}: {expenses_before.count()}")
        for exp in expenses_before:
            print(f"      {exp.date} | {exp.amount}€")

print("\n" + "=" * 80)
print("END OF ANALYSIS")
print("=" * 80)
