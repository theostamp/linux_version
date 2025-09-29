#!/usr/bin/env python3
"""
Script to test the financial dashboard API endpoint
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet
from users.models import CustomUser

def test_api_endpoint():
    print("🧪 Testing Financial Dashboard API Endpoint")
    print("=" * 50)
    
    with schema_context('demo'):
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/summary/?building_id=1&month=2025-09')
        
        # Mock user and query_params
        request.user = CustomUser.objects.filter(is_superuser=True).first()
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        try:
            # Call the summary method
            response = viewset.summary(request)
            
            print(f"📊 API Response Status: {response.status_code}")
            print(f"📊 API Response Data:")
            
            if response.status_code == 200:
                data = response.data
                print(f"  - Total Balance: {data.get('total_balance', 'N/A')}")
                print(f"  - Current Reserve: {data.get('current_reserve', 'N/A')}")
                print(f"  - Current Obligations: {data.get('current_obligations', 'N/A')}")
                print(f"  - Previous Obligations: {data.get('previous_obligations', 'N/A')}")
                print(f"  - Total Payments Month: {data.get('total_payments_month', 'N/A')}")
                print(f"  - Total Expenses Month: {data.get('total_expenses_month', 'N/A')}")
                print(f"  - Reserve Fund Contribution: {data.get('reserve_fund_contribution', 'N/A')}")
                
                print(f"\n📋 Full Response Data:")
                for key, value in data.items():
                    print(f"  {key}: {value}")
            else:
                print(f"❌ Error: {response.data}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_api_endpoint()
