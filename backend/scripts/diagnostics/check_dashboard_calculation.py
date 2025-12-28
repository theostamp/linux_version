#!/usr/bin/env python3
"""
Script to check the dashboard calculation and understand the relationship between amounts
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

def check_dashboard_calculation():
    print("🔍 Checking Dashboard Calculation for September 2025")
    print("=" * 60)
    
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
            
            if response.status_code == 200:
                data = response.data
                
                print("📊 API Response Data:")
                print(f"  - Current Obligations: {data.get('current_obligations', 'N/A')}€")
                print(f"  - Previous Obligations: {data.get('previous_obligations', 'N/A')}€")
                print(f"  - Total Balance: {data.get('total_balance', 'N/A')}€")
                print(f"  - Total Payments Month: {data.get('total_payments_month', 'N/A')}€")
                print(f"  - Total Expenses Month: {data.get('total_expenses_month', 'N/A')}€")
                print(f"  - Reserve Fund Contribution: {data.get('reserve_fund_contribution', 'N/A')}€")
                print(f"  - Total Management Cost: {data.get('total_management_cost', 'N/A')}€")
                
                # Calculate what the dashboard shows
                current_obligations = data.get('current_obligations', 0)
                previous_obligations = data.get('previous_obligations', 0)
                monthly_total = current_obligations + previous_obligations
                
                print(f"\n🧮 Dashboard Calculation:")
                print(f"  - Current Obligations: {current_obligations}€")
                print(f"  - Previous Obligations: {previous_obligations}€")
                print(f"  - Monthly Total (Dashboard): {monthly_total}€")
                
                # Check if this matches what we expect
                expected_monthly_total = 1176.67 + 1130.0
                print(f"  - Expected Monthly Total: {expected_monthly_total}€")
                print(f"  - Match: {'✅' if abs(monthly_total - expected_monthly_total) < 0.01 else '❌'}")
                
                # Check what the modal was showing before
                print(f"\n🔍 Modal Issues:")
                print(f"  - Modal was showing: 4,550.00€ (wrong)")
                print(f"  - Should show: {previous_obligations}€ (previous obligations)")
                print(f"  - Dashboard shows: {monthly_total}€ (current + previous)")
                
            else:
                print(f"❌ Error: {response.data}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    check_dashboard_calculation()
