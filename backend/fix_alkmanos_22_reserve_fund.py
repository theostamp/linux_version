#!/usr/bin/env python3
"""
Script to check and fix reserve fund settings for Αλκμάνος 22 (Building ID 2)
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
from decimal import Decimal
from dateutil.relativedelta import relativedelta

def fix_alkmanos_22_reserve_fund():
    """Check and fix reserve fund settings for Αλκμάνος 22"""
    
    with schema_context('demo'):
        # Get building ID 2 (Αλκμάνος 22)
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building ID 2 (Αλκμάνος 22) not found!")
            return
        
        print("🔍 CHECKING ΑΛΚΜΑΝΟΣ 22 RESERVE FUND SETTINGS")
        print("=" * 60)
        
        print(f"🏢 Building: {building.name}")
        print(f"📍 Address: {building.address}")
        print()
        
        print("📊 CURRENT SETTINGS:")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        print(f"   • Per Apartment Contribution: {building.reserve_contribution_per_apartment}€")
        print()
        
        # Calculate current monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            current_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"   • Current Monthly Target: {current_monthly:.2f}€")
        else:
            print("   • Current Monthly Target: Cannot calculate")
        
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
        
        # Fix settings if needed
        print("🔧 FIXING SETTINGS:")
        
        # Set correct values based on user requirements
        new_goal = Decimal('2000.00')
        new_duration = 12
        start_date = date(2025, 8, 1)
        target_date = start_date + relativedelta(months=new_duration)
        
        print(f"   • Setting Goal: {new_goal}€")
        print(f"   • Setting Duration: {new_duration} months")
        print(f"   • Setting Start Date: {start_date}")
        print(f"   • Setting Target Date: {target_date}")
        
        # Calculate new monthly target
        new_monthly = new_goal / new_duration
        print(f"   • New Monthly Target: {new_monthly:.2f}€")
        print()
        
        # Update the building settings
        building.reserve_fund_goal = new_goal
        building.reserve_fund_duration_months = new_duration
        building.reserve_fund_start_date = start_date
        building.reserve_fund_target_date = target_date
        building.save()
        
        print("✅ SETTINGS UPDATED SUCCESSFULLY!")
        print()
        
        # Verify the update
        building.refresh_from_db()
        print("📊 VERIFIED NEW SETTINGS:")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            verified_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"   • Monthly Target: {verified_monthly:.2f}€")
        
        print()
        
        # Test dashboard service again
        print("🔍 TESTING DASHBOARD SERVICE AFTER FIX:")
        dashboard_service = FinancialDashboardService(building.id)
        
        summary_current_after = dashboard_service.get_summary()
        print(f"   • Current View Monthly Target: {summary_current_after.get('reserve_fund_monthly_target', 0):.2f}€")
        
        summary_monthly_after = dashboard_service.get_summary(current_month)
        print(f"   • Monthly View ({current_month}) Monthly Target: {summary_monthly_after.get('reserve_fund_monthly_target', 0):.2f}€")
        
        print()
        
        # Summary
        print("📋 SUMMARY:")
        if summary_current_after.get('reserve_fund_monthly_target', 0) > 0:
            print("✅ SUCCESS: Monthly target is now displaying correctly!")
            print(f"   → Monthly Target: {summary_current_after.get('reserve_fund_monthly_target', 0):.2f}€")
        else:
            print("❌ ISSUE: Monthly target is still 0")
        
        print("=" * 60)

if __name__ == "__main__":
    fix_alkmanos_22_reserve_fund()
