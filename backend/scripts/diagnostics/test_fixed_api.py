#!/usr/bin/env python3
"""
Test the fixed calculate_advanced API with proper month filtering and result structure
"""
import os
import sys
import django
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory
from financial.views import CommonExpenseViewSet

def test_fixed_api():
    """Test the fixed calculate_advanced API"""
    
    with schema_context('demo'):
        print("🔍 Testing fixed calculate_advanced API...")
        
        # Create API request factory
        factory = APIRequestFactory()
        
        # Test 1: June 2025 (should show only management fees = 10€)
        print("\n📅 Test 1: June 2025 with month filtering")
        test_data_june = {
            'building_id': 1,
            'month_filter': '2025-06',
            'reserve_fund_monthly_total': 100
        }
        
        request = factory.post(
            '/api/financial/common-expenses/calculate_advanced/',
            data=json.dumps(test_data_june),
            content_type='application/json'
        )
        request.data = test_data_june  # Add data attribute for DRF
        
        viewset = CommonExpenseViewSet()
        response = viewset.calculate_advanced(request)
        
        print(f"📥 June Response status: {response.status_code}")
        if response.status_code == 200:
            result = response.data
            print(f"💰 June Total amount: {result.get('total_amount', 0)}€")
            print(f"🏢 June Management fees: {result.get('management_fees', 0)}€")
            print(f"🏦 June Reserve fund: {result.get('reserve_fund_contribution', 0)}€")
            
            if float(result.get('total_amount', 0)) <= 15:
                print("✅ SUCCESS: June filtering working correctly!")
            else:
                print("❌ FAILURE: June filtering still broken!")
        else:
            print(f"❌ June API call failed: {response.data}")
        
        # Test 2: August 2025 (should include 300€ ΔΕΗ + management fees)
        print("\n📅 Test 2: August 2025 with month filtering")
        test_data_august = {
            'building_id': 1,
            'month_filter': '2025-08',
            'reserve_fund_monthly_total': 100
        }
        
        request = factory.post(
            '/api/financial/common-expenses/calculate_advanced/',
            data=json.dumps(test_data_august),
            content_type='application/json'
        )
        request.data = test_data_august
        
        response = viewset.calculate_advanced(request)
        
        print(f"📥 August Response status: {response.status_code}")
        if response.status_code == 200:
            result = response.data
            print(f"💰 August Total amount: {result.get('total_amount', 0)}€")
            print(f"🏢 August Management fees: {result.get('management_fees', 0)}€")
            print(f"🏦 August Reserve fund: {result.get('reserve_fund_contribution', 0)}€")
            
            # Check expense totals
            expense_totals = result.get('expense_totals', {})
            print("📊 August Expense totals:")
            print(f"   General: {expense_totals.get('general', 0)}€")
            print(f"   Elevator: {expense_totals.get('elevator', 0)}€")
            print(f"   Heating: {expense_totals.get('heating', 0)}€")
            
            if float(result.get('total_amount', 0)) > 300:
                print("✅ SUCCESS: August filtering includes ΔΕΗ expense!")
            else:
                print("❌ FAILURE: August filtering missing expenses!")
                
            # Check breakdown structure
            breakdown = result.get('breakdown', {})
            if breakdown:
                first_apt = list(breakdown.values())[0]
                print("📋 First apartment breakdown:")
                print(f"   Total share: {first_apt.get('total_share', 0)}€")
                print(f"   General expenses: {first_apt.get('general_expenses', 0)}€")
                print(f"   Management fees: {first_apt.get('management_fees', 0)}€")
        else:
            print(f"❌ August API call failed: {response.data}")

if __name__ == "__main__":
    test_fixed_api()
