#!/usr/bin/env python3
"""
Script to test the dashboard API fix for reserve fund timeline validation
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService

def test_dashboard_reserve_fund_fix():
    """Test the dashboard API fix for reserve fund timeline validation"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print("🔍 DASHBOARD RESERVE FUND FIX TEST")
        print("=" * 50)
        print(f"🏢 Building: {building.name}")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Reserve fund target date: {building.reserve_fund_target_date}")
        print(f"💰 Reserve fund goal: {building.reserve_fund_goal}€")
        print(f"⏱️ Reserve fund duration: {building.reserve_fund_duration_months} months")
        print()
        
        # Test different months
        test_months = [
            "2024-04",  # Before start date (should be 0)
            "2025-02",  # Before start date (should be 0)
            "2025-07",  # Start date (should show reserve fund)
            "2025-08",  # After start date (should show reserve fund)
        ]
        
        for test_month in test_months:
            print(f"🧪 Testing month: {test_month}")
            
            # Create dashboard service
            dashboard = FinancialDashboardService(building.id)
            
            # Get summary for the month
            summary = dashboard.get_summary(month=test_month)
            
            # Extract relevant data
            reserve_fund_monthly_target = summary.get('reserve_fund_monthly_target', 0)
            reserve_fund_contribution = summary.get('reserve_fund_contribution', 0)
            current_obligations = summary.get('current_obligations', 0)
            total_balance = summary.get('total_balance', 0)
            
            print(f"   📊 Reserve fund monthly target: {reserve_fund_monthly_target:,.2f}€")
            print(f"   📊 Reserve fund contribution: {reserve_fund_contribution:,.2f}€")
            print(f"   📊 Current obligations: {current_obligations:,.2f}€")
            print(f"   📊 Total balance: {total_balance:,.2f}€")
            
            # Check if the month should have reserve fund
            if building.reserve_fund_start_date:
                try:
                    year, mon = map(int, test_month.split('-'))
                    selected_month_date = date(year, mon, 1)
                    
                    if selected_month_date < building.reserve_fund_start_date:
                        expected_result = "0.00€ (before start date)"
                        if reserve_fund_monthly_target == 0:
                            print(f"   ✅ CORRECT: {expected_result}")
                        else:
                            print(f"   ❌ ISSUE: Should be {expected_result}, but got {reserve_fund_monthly_target:,.2f}€")
                    elif (building.reserve_fund_target_date and 
                          selected_month_date > building.reserve_fund_target_date):
                        expected_result = "0.00€ (after target date)"
                        if reserve_fund_monthly_target == 0:
                            print(f"   ✅ CORRECT: {expected_result}")
                        else:
                            print(f"   ❌ ISSUE: Should be {expected_result}, but got {reserve_fund_monthly_target:,.2f}€")
                    else:
                        expected_result = "333.33€ (within collection period)"
                        if reserve_fund_monthly_target > 0:
                            print(f"   ✅ CORRECT: {expected_result}")
                        else:
                            print(f"   ❌ ISSUE: Should be {expected_result}, but got {reserve_fund_monthly_target:,.2f}€")
                except Exception as e:
                    print(f"   ❌ Error parsing month: {e}")
            else:
                print("   ⚠️ No reserve fund start date set")
            
            print()
        
        print("=" * 50)
        print("✅ DASHBOARD RESERVE FUND FIX TEST COMPLETED")
        print("=" * 50)

if __name__ == '__main__':
    test_dashboard_reserve_fund_fix()
