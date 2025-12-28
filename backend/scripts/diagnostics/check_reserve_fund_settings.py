#!/usr/bin/env python3
"""
Script to check reserve fund settings and calculate correct monthly amount
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.services import FinancialDashboardService

def check_reserve_fund_settings():
    """Check current reserve fund settings and calculations"""
    
    with schema_context('demo'):
        building = Building.objects.first()
        apartments = Apartment.objects.filter(building_id=building.id)
        
        print("🔍 RESERVE FUND SETTINGS ANALYSIS")
        print("=" * 50)
        
        print(f"🏢 Building: {building.name}")
        print(f"📊 Apartments: {apartments.count()}")
        print()
        
        print("💰 RESERVE FUND CONFIGURATION:")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        print(f"   • Per Apartment Contribution: {building.reserve_contribution_per_apartment}€")
        print()
        
        # Calculate expected monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"✅ EXPECTED MONTHLY TARGET: {expected_monthly:.2f}€")
        else:
            print("❌ Cannot calculate expected monthly target - missing goal or duration")
            expected_monthly = 0
        
        print()
        
        # Check dashboard service calculation
        print("🔍 DASHBOARD SERVICE CALCULATIONS:")
        dashboard_service = FinancialDashboardService(building.id)
        
        # Test without month (current view)
        summary_current = dashboard_service.get_summary()
        print(f"   • Current View Monthly Target: {summary_current.get('reserve_fund_monthly_target', 0):.2f}€")
        
        # Test with current month
        from datetime import datetime
        current_month = datetime.now().strftime('%Y-%m')
        summary_monthly = dashboard_service.get_summary(current_month)
        print(f"   • Monthly View ({current_month}) Monthly Target: {summary_monthly.get('reserve_fund_monthly_target', 0):.2f}€")
        
        print()
        
        # Check if the issue is in the period calculation
        print("🔍 PERIOD CALCULATION ANALYSIS:")
        is_within_period = dashboard_service._is_month_within_reserve_fund_period(current_month)
        print(f"   • Is {current_month} within reserve fund period: {is_within_period}")
        
        if building.reserve_fund_start_date and building.reserve_fund_duration_months:
            from dateutil.relativedelta import relativedelta
            if building.reserve_fund_target_date:
                target_date = building.reserve_fund_target_date
            else:
                target_date = building.reserve_fund_start_date + relativedelta(months=building.reserve_fund_duration_months)
            
            print(f"   • Collection Period: {building.reserve_fund_start_date} to {target_date}")
            print(f"   • Current Date: {datetime.now().date()}")
            
            # Check if current date is within period
            current_date = datetime.now().date()
            is_current_within = building.reserve_fund_start_date <= current_date <= target_date
            print(f"   • Is current date within period: {is_current_within}")
        
        print()
        
        # Summary
        print("📋 SUMMARY:")
        if expected_monthly > 0:
            if summary_current.get('reserve_fund_monthly_target', 0) == 0:
                print("❌ ISSUE: Monthly target is 0 in current view (should show the calculated amount)")
                print("   → This is why the monthly amount is not displaying")
            else:
                print("✅ Monthly target is calculated correctly")
        else:
            print("❌ ISSUE: Cannot calculate monthly target due to missing configuration")
        
        print("=" * 50)

if __name__ == "__main__":
    check_reserve_fund_settings()
