#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from django.test import RequestFactory
from financial.views import FinancialViewSet

def test_api_response_debug():
    """Test what the actual API endpoint returns vs what FinancialDashboardService returns"""
    
    with schema_context('demo'):
        print("🔍 Testing API Response Debug")
        print("=" * 60)
        
        building_id = 1
        
        # Test 1: Direct FinancialDashboardService call
        print("🔧 Test 1: Direct FinancialDashboardService call")
        service = FinancialDashboardService(building_id)
        summary = service.get_summary(month='2025-08')
        
        print(f"   reserve_fund_start_date: {summary.get('reserve_fund_start_date')}")
        print(f"   reserve_fund_target_date: {summary.get('reserve_fund_target_date')}")
        print(f"   reserve_fund_goal: {summary.get('reserve_fund_goal')}")
        print(f"   reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target')}")
        
        # Test 2: API endpoint call simulation
        print("\n🌐 Test 2: API endpoint simulation")
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/summary/?building_id=1&month=2025-08')
        
        # Create viewset instance
        viewset = FinancialViewSet()
        viewset.request = request
        
        # Call the summary method directly
        try:
            response = viewset.summary(request)
            response_data = response.data
            
            print(f"   API Response Status: {response.status_code}")
            print(f"   reserve_fund_start_date: {response_data.get('reserve_fund_start_date')}")
            print(f"   reserve_fund_target_date: {response_data.get('reserve_fund_target_date')}")
            print(f"   reserve_fund_goal: {response_data.get('reserve_fund_goal')}")
            print(f"   reserve_fund_monthly_target: {response_data.get('reserve_fund_monthly_target')}")
            
            # Check if the fields exist in response
            print("\n🔍 Field existence check:")
            all_keys = list(response_data.keys())
            reserve_keys = [k for k in all_keys if 'reserve' in k.lower()]
            print(f"   All reserve-related keys: {reserve_keys}")
            
        except Exception as e:
            print(f"   API Error: {e}")
        
        # Test 3: Check what keys are in the summary
        print("\n📋 Test 3: All keys in FinancialDashboardService summary:")
        all_summary_keys = list(summary.keys())
        reserve_summary_keys = [k for k in all_summary_keys if 'reserve' in k.lower()]
        print(f"   All reserve-related keys: {reserve_summary_keys}")
        
        for key in reserve_summary_keys:
            print(f"   {key}: {summary.get(key)}")

if __name__ == "__main__":
    test_api_response_debug()
