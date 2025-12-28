#!/usr/bin/env python3
"""
Check if management fees are included in transaction calculations
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
from financial.models import Transaction, Expense
from apartments.models import Apartment
from buildings.models import Building

def check_management_fees():
    """Check if management fees create transactions"""

    with schema_context('demo'):
        building_id = 1
        building = Building.objects.get(id=building_id)

        print("\n" + "="*80)
        print("📊 MANAGEMENT FEES ANALYSIS")
        print("="*80)

        print(f"\n🏢 Building: {building.name}")
        print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")

        # Check September transactions
        print("\n🗓️ SEPTEMBER 2025 TRANSACTIONS:")
        print("-"*40)

        sept_start = date(2025, 9, 1)
        sept_end = date(2025, 9, 30)

        # Get all transactions for September
        sept_transactions = Transaction.objects.filter(
            building_id=building_id,
            date__range=(sept_start, sept_end)
        ).select_related('apartment')

        # Look for management fee transactions
        management_transactions = []
        for trans in sept_transactions:
            if 'διαχείριση' in trans.description.lower() or 'management' in trans.description.lower():
                management_transactions.append(trans)

        print(f"Total Transactions: {sept_transactions.count()}")
        print(f"Management Fee Transactions: {len(management_transactions)}")

        if management_transactions:
            print("\nManagement Fee Transactions Found:")
            for trans in management_transactions[:5]:
                print(f"  - {trans.apartment.number if trans.apartment else 'N/A'}: €{trans.amount} - {trans.description}")
        else:
            print("\n⚠️ NO MANAGEMENT FEE TRANSACTIONS FOUND!")

        # Check October transactions
        print("\n🗓️ OCTOBER 2025 TRANSACTIONS:")
        print("-"*40)

        oct_start = date(2025, 10, 1)
        oct_end = date(2025, 10, 31)

        oct_transactions = Transaction.objects.filter(
            building_id=building_id,
            date__range=(oct_start, oct_end)
        ).select_related('apartment')

        # Look for management fee transactions
        management_transactions_oct = []
        for trans in oct_transactions:
            if 'διαχείριση' in trans.description.lower() or 'management' in trans.description.lower():
                management_transactions_oct.append(trans)

        print(f"Total Transactions: {oct_transactions.count()}")
        print(f"Management Fee Transactions: {len(management_transactions_oct)}")

        # Check if management fees are stored as expenses
        print("\n📋 CHECKING EXPENSES FOR MANAGEMENT FEES:")
        print("-"*40)

        # Check all expenses for management category
        management_expenses = Expense.objects.filter(
            building_id=building_id,
            category='management_fees'
        ).order_by('-date')[:5]

        print(f"Management Category Expenses Found: {management_expenses.count()}")
        for exp in management_expenses:
            print(f"  - {exp.date}: {exp.title} - €{exp.amount}")

        # Summary
        print("\n" + "="*80)
        print("📊 SUMMARY:")
        print("="*80)

        if not management_transactions and not management_transactions_oct:
            print("⚠️ Management fees are NOT creating transactions!")
            print("This means they won't be included in historical balance calculations.")
            print("\nPossible reasons:")
            print("1. Management fees are calculated on-the-fly but not stored as transactions")
            print("2. They are only included in the current month's obligations")
            print("3. They need to be issued as common expenses to create transactions")
        else:
            print("✅ Management fees ARE creating transactions.")
            print("They should be included in historical balance calculations.")

if __name__ == '__main__':
    check_management_fees()