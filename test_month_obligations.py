#!/usr/bin/env python3
"""
Test script to check apartment obligations for September and October 2025
"""
import os
import sys
import json
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Transaction
from apartments.models import Apartment
from buildings.models import Building

def get_apartment_balances(building_id, month=None):
    """Calculate apartment balances for a specific month"""
    from financial.views import ApartmentBalancesViewSet
    from django.test import RequestFactory
    from users.models import CustomUser

    # Create a request factory
    factory = RequestFactory()

    # Create a mock request
    params = {'building_id': str(building_id)}
    if month:
        params['month'] = month

    # Construct URL with parameters
    url = f'/financial/dashboard/apartment_balances/?{"&".join([f"{k}={v}" for k, v in params.items()])}'
    request = factory.get(url)

    # Mock user and query_params
    request.user = CustomUser.objects.filter(is_superuser=True).first()
    request.query_params = request.GET

    # Create viewset and get response
    viewset = ApartmentBalancesViewSet()
    viewset.request = request
    response = viewset.list(request)

    return response.data

def get_financial_summary(building_id, month=None):
    """Get financial summary for a specific month"""
    from financial.views import FinancialSummaryViewSet
    from django.test import RequestFactory
    from users.models import CustomUser

    # Create a request factory
    factory = RequestFactory()

    # Create a mock request
    params = {'building_id': str(building_id)}
    if month:
        params['month'] = month

    # Construct URL with parameters
    url = f'/financial/dashboard/summary/?{"&".join([f"{k}={v}" for k, v in params.items()])}'
    request = factory.get(url)

    # Mock user and query_params
    request.user = CustomUser.objects.filter(is_superuser=True).first()
    request.query_params = request.GET

    # Create viewset and get response
    viewset = FinancialSummaryViewSet()
    viewset.request = request
    response = viewset.list(request)

    return response.data

def compare_months():
    """Compare September and October 2025 obligations"""

    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22, Αθήνα

        print("\n" + "="*80)
        print("📊 CHECKING APARTMENT OBLIGATIONS FOR SEPTEMBER & OCTOBER 2025")
        print("="*80)

        # Get September data
        print("\n🗓️ SEPTEMBER 2025 DATA:")
        print("-"*40)
        sep_balances = get_apartment_balances(building_id, '2025-09')
        sep_summary = get_financial_summary(building_id, '2025-09')

        print(f"Total Previous Obligations: €{sep_summary.get('total_previous_obligations', 0):,.2f}")
        print(f"Total Current Obligations: €{sep_summary.get('total_current_obligations', 0):,.2f}")
        print(f"Total Obligations: €{sep_summary.get('total_obligations', 0):,.2f}")
        print(f"Total Payments: €{sep_summary.get('total_payments', 0):,.2f}")

        # Get apartments with debts in September
        sep_debts = {}
        print("\nApartments with debts:")
        for apt in sep_balances['apartments']:
            if apt['net_obligation'] > 0.30:  # Significant debt
                sep_debts[apt['apartment_id']] = apt['net_obligation']
                print(f"  - Apartment {apt['apartment_number']}: €{apt['net_obligation']:,.2f}")

        # Get October data
        print("\n🗓️ OCTOBER 2025 DATA:")
        print("-"*40)
        oct_balances = get_apartment_balances(building_id, '2025-10')
        oct_summary = get_financial_summary(building_id, '2025-10')

        print(f"Total Previous Obligations: €{oct_summary.get('total_previous_obligations', 0):,.2f}")
        print(f"Total Current Obligations: €{oct_summary.get('total_current_obligations', 0):,.2f}")
        print(f"Total Obligations: €{oct_summary.get('total_obligations', 0):,.2f}")
        print(f"Total Payments: €{oct_summary.get('total_payments', 0):,.2f}")

        # Check October previous balances
        print("\nApartments previous balances in October:")
        for apt in oct_balances['apartments']:
            if apt['apartment_id'] in sep_debts:
                sep_debt = sep_debts[apt['apartment_id']]
                oct_prev = apt.get('previous_balance', 0)
                print(f"  - Apartment {apt['apartment_number']}:")
                print(f"      Sep net obligation: €{sep_debt:,.2f}")
                print(f"      Oct previous balance: €{oct_prev:,.2f}")
                if abs(sep_debt - oct_prev) > 0.01:
                    print(f"      ⚠️ MISMATCH: Difference of €{abs(sep_debt - oct_prev):,.2f}")

        # Check transactions for October
        print("\n📋 CHECKING OCTOBER TRANSACTIONS:")
        print("-"*40)

        # Get all transactions for October
        from datetime import date
        october_start = date(2025, 10, 1)
        october_end = date(2025, 10, 31)

        transactions = Transaction.objects.filter(
            building_id=building_id,
            transaction_date__range=(october_start, october_end)
        ).select_related('apartment', 'expense', 'payment')

        # Group by type
        expense_transactions = []
        payment_transactions = []
        balance_adjustments = []

        for trans in transactions:
            if trans.expense:
                expense_transactions.append(trans)
            elif trans.payment:
                payment_transactions.append(trans)
            elif trans.transaction_type == 'balance_adjustment':
                balance_adjustments.append(trans)

        print(f"Total Transactions: {transactions.count()}")
        print(f"  - Expense Transactions: {len(expense_transactions)}")
        print(f"  - Payment Transactions: {len(payment_transactions)}")
        print(f"  - Balance Adjustments: {len(balance_adjustments)}")

        # Check for previous balance adjustments
        if balance_adjustments:
            print("\n⚠️ BALANCE ADJUSTMENTS FOUND:")
            for adj in balance_adjustments[:5]:  # Show first 5
                print(f"  - Apartment {adj.apartment.apartment_number}: €{adj.amount:,.2f}")
                print(f"    Description: {adj.description}")

        # Summary
        print("\n" + "="*80)
        print("📊 SUMMARY:")
        print("="*80)

        expected_oct_prev = sum(sep_debts.values())
        actual_oct_prev = oct_summary.get('total_previous_obligations', 0)

        print(f"Expected October Previous Obligations: €{expected_oct_prev:,.2f}")
        print(f"Actual October Previous Obligations: €{actual_oct_prev:,.2f}")
        print(f"Difference: €{abs(expected_oct_prev - actual_oct_prev):,.2f}")

        if abs(expected_oct_prev - actual_oct_prev) > 0.01:
            print("\n⚠️ WARNING: Previous obligations are not being carried forward correctly!")
        else:
            print("\n✅ Previous obligations are being carried forward correctly.")

if __name__ == '__main__':
    compare_months()