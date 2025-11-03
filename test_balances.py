#!/usr/bin/env python3
"""
Simple test script to check apartment balances calculation for September and October 2025
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
from financial.services import FinancialDashboardService
from apartments.models import Apartment

def check_balances():
    """Check apartment balances for September and October 2025"""

    with schema_context('demo'):
        building_id = 1
        service = FinancialDashboardService(building_id)

        print("\n" + "="*80)
        print("📊 APARTMENT BALANCES CALCULATION TEST")
        print("="*80)

        # Get September summary
        print("\n🗓️ SEPTEMBER 2025:")
        print("-"*40)
        sep_summary = service.get_summary('2025-09')
        sep_balances = service.get_apartment_balances('2025-09')

        print(f"Total Previous Obligations: €{sep_summary['previous_obligations']:,.2f}")
        print(f"Total Current Obligations: €{sep_summary['current_obligations']:,.2f}")
        print(f"Total Balance: €{sep_summary['total_balance']:,.2f}")

        # Show apartments with significant debts
        print("\nApartments with debts (>€0.30):")
        sep_debts = {}
        for apt in sep_balances:
            balance = apt.get('current_balance', 0)
            if balance > 0.30:  # Debt
                sep_debts[apt['apartment_id']] = balance
                print(f"  Apartment {apt['apartment_number']}: €{balance:,.2f}")

        # Get October summary
        print("\n🗓️ OCTOBER 2025:")
        print("-"*40)
        oct_summary = service.get_summary('2025-10')
        oct_balances = service.get_apartment_balances('2025-10')

        print(f"Total Previous Obligations: €{oct_summary['previous_obligations']:,.2f}")
        print(f"Total Current Obligations: €{oct_summary['current_obligations']:,.2f}")
        print(f"Total Balance: €{oct_summary['total_balance']:,.2f}")

        # Check if September debts carried forward
        print("\nChecking debt carryover:")
        for apt in oct_balances:
            if apt['apartment_id'] in sep_debts:
                sep_debt = sep_debts[apt['apartment_id']]
                oct_balance = apt.get('current_balance', 0)
                print(f"  Apartment {apt['apartment_number']}:")
                print(f"    Sept debt: €{sep_debt:,.2f}")
                print(f"    Oct balance: €{oct_balance:,.2f}")

        # Check calculation method
        print("\n📋 CHECKING CALCULATION METHOD:")
        print("-"*40)

        # Test _calculate_historical_balance for October 1st
        test_apartment = Apartment.objects.filter(building_id=building_id).first()
        if test_apartment:
            october_start = date(2025, 10, 1)
            historical_balance = service._calculate_historical_balance(test_apartment, october_start)
            print(f"Test apartment {test_apartment.apartment_number}:")
            print(f"  Historical balance on Oct 1: €{historical_balance:,.2f}")
            print(f"  Current balance field: €{test_apartment.current_balance:,.2f}")

        # Summary
        print("\n" + "="*80)
        print("📊 SUMMARY:")
        print("="*80)

        total_sep_debts = sum(sep_debts.values())
        oct_prev = oct_summary['previous_obligations']

        print(f"Total September debts: €{total_sep_debts:,.2f}")
        print(f"October previous obligations: €{oct_prev:,.2f}")
        print(f"Difference: €{abs(total_sep_debts - oct_prev):,.2f}")

        if abs(total_sep_debts - oct_prev) > 0.01:
            print("\n⚠️ WARNING: Debts not matching!")
            print("Possible reasons:")
            print("1. The calculation uses expenses BEFORE the month, not balances")
            print("2. Payments made in September may affect the calculation")
            print("3. Management fees or reserve fund contributions may be included")
        else:
            print("\n✅ Debts are being carried forward correctly!")

if __name__ == '__main__':
    check_balances()