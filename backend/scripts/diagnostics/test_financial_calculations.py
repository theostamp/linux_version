#!/usr/bin/env python
"""
Financial System Diagnostic Script
Tests if common expense calculations work correctly for monthly notifications.
"""
import os
import sys
import django
from datetime import date

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import CommonExpense, CommonExpenseShare, Transaction
from notifications.services import MonthlyTaskService


def test_financial_system():
    """Run comprehensive financial system tests."""

    print("=" * 80)
    print("FINANCIAL SYSTEM DIAGNOSTIC TEST")
    print("=" * 80)
    print()

    with schema_context('demo'):
        # 1. Check Buildings
        print("1. BUILDINGS CHECK")
        print("-" * 80)
        buildings = Building.objects.all()
        print(f"Total buildings: {buildings.count()}")

        if buildings.count() == 0:
            print("❌ ERROR: No buildings found!")
            return

        for building in buildings[:3]:  # Show first 3
            print(f"  - {building.name or building.street} (ID: {building.id})")
            print(f"    Apartments: {building.apartments.count()}")
        print()

        # 2. Check Apartments
        print("2. APARTMENTS CHECK")
        print("-" * 80)
        apartments = Apartment.objects.select_related('building').all()
        print(f"Total apartments: {apartments.count()}")

        if apartments.count() == 0:
            print("❌ ERROR: No apartments found!")
            return

        # Show sample apartments
        for apt in apartments[:5]:
            print(f"  - {apt.apartment_number} in {apt.building.name or apt.building.street}")
            print(f"    Owner: {apt.owner or 'N/A'}")
            print(f"    Email: {apt.owner_email or 'N/A'}")
            print(f"    Phone: {apt.owner_phone or 'N/A'}")
            print(f"    Mills: {apt.participation_mills or 0}")
        print()

        # 3. Check Common Expenses
        print("3. COMMON EXPENSES CHECK")
        print("-" * 80)
        common_expenses = CommonExpense.objects.select_related('building').all()
        print(f"Total common expenses: {common_expenses.count()}")

        if common_expenses.count() == 0:
            print("⚠️  WARNING: No common expenses found!")
            print("    Calculations will return 0.00€")
            print()
        else:
            # Show recent common expenses
            for ce in common_expenses.order_by('-period_start')[:5]:
                print(f"  - {ce.building.name or ce.building.street}")
                print(f"    Period: {ce.period_start} to {ce.period_end}")
                print(f"    Total: {ce.total_amount}€")
                print(f"    Shares: {ce.shares.count()} apartments")
        print()

        # 4. Check Common Expense Shares
        print("4. COMMON EXPENSE SHARES CHECK")
        print("-" * 80)
        shares = CommonExpenseShare.objects.select_related('common_expense', 'apartment').all()
        print(f"Total expense shares: {shares.count()}")

        if shares.count() == 0:
            print("⚠️  WARNING: No expense shares found!")
            print("    Each apartment should have a share record for each common expense")
            print()
        else:
            # Show sample shares
            for share in shares[:5]:
                print(f"  - Apartment {share.apartment.apartment_number}")
                print(f"    Period: {share.common_expense.period_start.strftime('%m/%Y')}")
                print(f"    Expense Share: {share.expense_share}€")
        print()

        # 5. Test Calculation Functions
        print("5. CALCULATION FUNCTIONS TEST")
        print("-" * 80)

        test_apartment = apartments.first()
        test_period = date(2025, 10, 1)

        print(f"Testing with: {test_apartment.apartment_number} in {test_apartment.building.name or test_apartment.building.street}")
        print(f"Test period: {test_period.strftime('%m/%Y')}")
        print()

        # Test common expense calculation
        print("  Testing _calculate_common_expense()...")
        try:
            common_expense_amount = MonthlyTaskService._calculate_common_expense(
                test_apartment,
                test_period
            )
            if common_expense_amount == 0.0:
                print(f"  ⚠️  Result: {common_expense_amount:.2f}€ (ZERO - may indicate missing data)")
            else:
                print(f"  ✅ Result: {common_expense_amount:.2f}€")
        except Exception as e:
            print(f"  ❌ ERROR: {str(e)}")
        print()

        # Test previous balance calculation
        print("  Testing _calculate_previous_balance()...")
        try:
            previous_balance = MonthlyTaskService._calculate_previous_balance(
                test_apartment,
                test_period
            )
            print(f"  ✅ Result: {previous_balance:.2f}€")
        except Exception as e:
            print(f"  ❌ ERROR: {str(e)}")
        print()

        # 6. Check Transactions
        print("6. TRANSACTIONS CHECK")
        print("-" * 80)
        transactions = Transaction.objects.filter(apartment=test_apartment).order_by('-date')
        print(f"Transactions for {test_apartment.apartment_number}: {transactions.count()}")

        if transactions.count() > 0:
            for txn in transactions[:5]:
                sign = "+" if txn.transaction_type in ['common_expense', 'obligation'] else "-"
                print(f"  - {txn.date}: {sign}{txn.amount}€ ({txn.get_transaction_type_display()})")
        else:
            print("  No transactions found")
        print()

        # 7. Summary & Recommendations
        print("7. SUMMARY & RECOMMENDATIONS")
        print("=" * 80)

        issues = []

        if buildings.count() == 0:
            issues.append("❌ No buildings in database")

        if apartments.count() == 0:
            issues.append("❌ No apartments in database")

        if common_expenses.count() == 0:
            issues.append("⚠️  No common expenses - calculations will return 0.00€")

        if shares.count() == 0:
            issues.append("⚠️  No expense shares - apartment-specific amounts unavailable")

        if not test_apartment.owner_email:
            issues.append("⚠️  Sample apartment has no email - notifications can't be sent")

        if issues:
            print("ISSUES FOUND:")
            for issue in issues:
                print(f"  {issue}")
            print()
            print("RECOMMENDED ACTIONS:")
            if "No common expenses" in str(issues):
                print("  1. Create CommonExpense records for October 2025")
                print("  2. Run common expense calculator to generate shares")
            if "No expense shares" in str(issues):
                print("  3. Ensure CommonExpenseShare records exist for each apartment")
            if "no email" in str(issues):
                print("  4. Add email addresses to apartment owner records")
        else:
            print("✅ All checks passed! Financial system ready for monthly notifications.")

        print()
        print("=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)


if __name__ == '__main__':
    test_financial_system()
