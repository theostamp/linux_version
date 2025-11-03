#!/usr/bin/env python3
"""
Test script to check apartment obligations for September and October 2025
using direct HTTP requests to the API
"""
import os
import sys
import json
import requests
from decimal import Decimal

# API configuration
BASE_URL = "http://localhost:8000/api"
BUILDING_ID = 1

def get_auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/auth/login/", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get('access')
    else:
        print(f"Failed to authenticate: {response.status_code}")
        return None

def make_api_call(endpoint, token, params=None):
    """Make authenticated API call"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"API call failed: {response.status_code} - {response.text}")
        return None

def compare_months():
    """Compare September and October 2025 obligations"""

    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Authentication failed")
        return

    print("\n" + "="*80)
    print("📊 CHECKING APARTMENT OBLIGATIONS FOR SEPTEMBER & OCTOBER 2025")
    print("="*80)

    # Get September data
    print("\n🗓️ SEPTEMBER 2025 DATA:")
    print("-"*40)

    sep_params = {"building_id": BUILDING_ID, "month": "2025-09"}
    sep_balances = make_api_call("/financial/dashboard/apartment_balances/", token, sep_params)
    sep_summary = make_api_call("/financial/dashboard/summary/", token, sep_params)

    if not sep_balances or not sep_summary:
        print("Failed to get September data")
        return

    print(f"Total Previous Obligations: €{sep_summary.get('total_previous_obligations', 0):,.2f}")
    print(f"Total Current Obligations: €{sep_summary.get('total_current_obligations', 0):,.2f}")
    print(f"Total Obligations: €{sep_summary.get('total_obligations', 0):,.2f}")
    print(f"Total Payments: €{sep_summary.get('total_payments', 0):,.2f}")

    # Get apartments with debts in September
    sep_debts = {}
    print("\nApartments with debts in September:")
    for apt in sep_balances.get('apartments', []):
        if apt.get('net_obligation', 0) > 0.30:  # Significant debt
            sep_debts[apt['apartment_id']] = apt['net_obligation']
            print(f"  - Apartment {apt['apartment_number']}: €{apt['net_obligation']:,.2f}")
            print(f"      Previous: €{apt.get('previous_balance', 0):,.2f}")
            print(f"      Current: €{apt.get('expense_share', 0):,.2f}")
            print(f"      Reserve: €{apt.get('reserve_fund_share', 0):,.2f}")

    # Get October data
    print("\n🗓️ OCTOBER 2025 DATA:")
    print("-"*40)

    oct_params = {"building_id": BUILDING_ID, "month": "2025-10"}
    oct_balances = make_api_call("/financial/dashboard/apartment_balances/", token, oct_params)
    oct_summary = make_api_call("/financial/dashboard/summary/", token, oct_params)

    if not oct_balances or not oct_summary:
        print("Failed to get October data")
        return

    print(f"Total Previous Obligations: €{oct_summary.get('total_previous_obligations', 0):,.2f}")
    print(f"Total Current Obligations: €{oct_summary.get('total_current_obligations', 0):,.2f}")
    print(f"Total Obligations: €{oct_summary.get('total_obligations', 0):,.2f}")
    print(f"Total Payments: €{oct_summary.get('total_payments', 0):,.2f}")

    # Check October previous balances
    print("\nOctober apartment balances (for those with Sept debts):")
    for apt in oct_balances.get('apartments', []):
        if apt['apartment_id'] in sep_debts:
            sep_debt = sep_debts[apt['apartment_id']]
            oct_prev = apt.get('previous_balance', 0)
            print(f"  - Apartment {apt['apartment_number']}:")
            print(f"      Sept net obligation: €{sep_debt:,.2f}")
            print(f"      Oct previous balance: €{oct_prev:,.2f}")
            print(f"      Oct current expenses: €{apt.get('expense_share', 0):,.2f}")
            print(f"      Oct net obligation: €{apt.get('net_obligation', 0):,.2f}")
            if abs(sep_debt - oct_prev) > 0.01:
                print(f"      ⚠️ MISMATCH: Difference of €{abs(sep_debt - oct_prev):,.2f}")

    # Summary
    print("\n" + "="*80)
    print("📊 SUMMARY:")
    print("="*80)

    expected_oct_prev = sum(sep_debts.values())
    actual_oct_prev = oct_summary.get('total_previous_obligations', 0)

    print(f"Expected October Previous Obligations (sum of Sept debts): €{expected_oct_prev:,.2f}")
    print(f"Actual October Previous Obligations (from API): €{actual_oct_prev:,.2f}")
    print(f"Difference: €{abs(expected_oct_prev - actual_oct_prev):,.2f}")

    if abs(expected_oct_prev - actual_oct_prev) > 0.01:
        print("\n⚠️ WARNING: Previous obligations are not being carried forward correctly!")
        print("The API might be using a different calculation method.")
    else:
        print("\n✅ Previous obligations are being carried forward correctly.")

    # Get apartment obligations details for October
    print("\n📋 OCTOBER APARTMENT OBLIGATIONS DETAILS:")
    print("-"*40)

    obligations_data = make_api_call("/financial/dashboard/apartment_obligations/", token, oct_params)
    if obligations_data:
        total_from_obligations = sum(
            apt.get('net_obligation', 0)
            for apt in obligations_data.get('apartments', [])
            if apt.get('net_obligation', 0) > 0
        )
        print(f"Total obligations from apartment_obligations endpoint: €{total_from_obligations:,.2f}")

        # Show a few apartment details
        print("\nFirst 3 apartments with obligations:")
        for apt in obligations_data.get('apartments', [])[:3]:
            if apt.get('net_obligation', 0) > 0:
                print(f"  - {apt['apartment_number']}: Net obligation: €{apt.get('net_obligation', 0):,.2f}")

if __name__ == '__main__':
    compare_months()