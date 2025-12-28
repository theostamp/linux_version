#!/usr/bin/env python3
"""
Test script to verify that the backend month filtering fix works correctly.
Tests both calculate and calculate_advanced endpoints with month_filter parameter.
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

def test_month_filtering():
    """Test month filtering for both calculate endpoints"""
    
    with schema_context('demo'):
        # Test data
        building_id = 1  # Αλκμάνος 22
        february_month = "2025-02"  # Should show only 10€ management fees
        august_month = "2025-08"    # Should show 300€ ΔΕΗ + 10€ management fees
        
        print("🧪 Testing Month Filtering Fix")
        print("=" * 50)
        
        # Test 1: Regular calculate endpoint with February (should be 10€)
        print(f"\n1. Testing calculate endpoint for {february_month}:")
        
        from financial.views import CommonExpenseViewSet
        from django.test import RequestFactory
        
        factory = RequestFactory()
        
        # Create request for February
        request_data = {
            'building_id': building_id,
            'month_filter': february_month,
            'include_reserve_fund': True
        }
        
        request = factory.post('/financial/common-expenses/calculate/', 
                              data=json.dumps(request_data),
                              content_type='application/json')
        request.data = request_data
        
        viewset = CommonExpenseViewSet()
        response = viewset.calculate(request)
        
        if response.status_code == 200:
            total_expenses = response.data.get('total_expenses', 0)
            print(f"   ✅ February total expenses: {total_expenses}€")
            print("   Expected: ~10€ (management fees only)")
            if total_expenses <= 15:  # Allow small variance
                print("   ✅ PASS: Correctly filtered expenses for February")
            else:
                print(f"   ❌ FAIL: Expected ~10€, got {total_expenses}€")
        else:
            print(f"   ❌ Error: {response.data}")
        
        # Test 2: Regular calculate endpoint with August (should be 310€)
        print(f"\n2. Testing calculate endpoint for {august_month}:")
        
        request_data['month_filter'] = august_month
        request = factory.post('/financial/common-expenses/calculate/', 
                              data=json.dumps(request_data),
                              content_type='application/json')
        request.data = request_data
        
        response = viewset.calculate(request)
        
        if response.status_code == 200:
            total_expenses = response.data.get('total_expenses', 0)
            print(f"   ✅ August total expenses: {total_expenses}€")
            print("   Expected: ~310€ (300€ ΔΕΗ + 10€ management)")
            if total_expenses >= 300:  # Should include ΔΕΗ
                print("   ✅ PASS: Correctly included August expenses")
            else:
                print(f"   ❌ FAIL: Expected ~310€, got {total_expenses}€")
        else:
            print(f"   ❌ Error: {response.data}")
        
        # Test 3: Advanced calculate endpoint with February
        print(f"\n3. Testing calculate_advanced endpoint for {february_month}:")
        
        advanced_request_data = {
            'building_id': building_id,
            'month_filter': february_month,
            'reserve_fund_monthly_total': 0
        }
        
        request = factory.post('/financial/common-expenses/calculate_advanced/', 
                              data=json.dumps(advanced_request_data),
                              content_type='application/json')
        request.data = advanced_request_data
        
        response = viewset.calculate_advanced(request)
        
        if response.status_code == 200:
            expense_totals = response.data.get('expense_totals', {})
            total_general = float(expense_totals.get('general', 0))
            print(f"   ✅ February advanced general expenses: {total_general}€")
            print("   Expected: ~10€ (management fees only)")
            if total_general <= 15:  # Allow small variance
                print("   ✅ PASS: Advanced calculator correctly filtered February")
            else:
                print(f"   ❌ FAIL: Expected ~10€, got {total_general}€")
        else:
            print(f"   ❌ Error: {response.data}")
        
        # Test 4: Advanced calculate endpoint with August
        print(f"\n4. Testing calculate_advanced endpoint for {august_month}:")
        
        advanced_request_data['month_filter'] = august_month
        request = factory.post('/financial/common-expenses/calculate_advanced/', 
                              data=json.dumps(advanced_request_data),
                              content_type='application/json')
        request.data = advanced_request_data
        
        response = viewset.calculate_advanced(request)
        
        if response.status_code == 200:
            expense_totals = response.data.get('expense_totals', {})
            total_general = float(expense_totals.get('general', 0))
            print(f"   ✅ August advanced general expenses: {total_general}€")
            print("   Expected: ~310€ (300€ ΔΕΗ + 10€ management)")
            if total_general >= 300:  # Should include ΔΕΗ
                print("   ✅ PASS: Advanced calculator correctly included August expenses")
            else:
                print(f"   ❌ FAIL: Expected ~310€, got {total_general}€")
        else:
            print(f"   ❌ Error: {response.data}")
        
        print("\n" + "=" * 50)
        print("🏁 Month filtering test completed!")
        print("\nIf all tests pass, the frontend should now show:")
        print("- February: ~10€ (management fees only)")
        print("- August: ~310€ (300€ ΔΕΗ + 10€ management)")

if __name__ == "__main__":
    test_month_filtering()
