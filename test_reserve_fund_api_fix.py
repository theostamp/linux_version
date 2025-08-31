#!/usr/bin/env python3

import os
import sys
import django
import json
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

def test_reserve_fund_api_fix():
    """Test that Reserve Fund start date is now included in API response"""
    
    with schema_context('demo'):
        print("🔍 Testing Reserve Fund API Fix")
        print("=" * 60)
        
        # Test with building 1 (Αλκμάνος 22)
        building_id = 1
        
        print(f"🏢 Testing Building ID: {building_id}")
        
        # Create FinancialDashboardService instance
        service = FinancialDashboardService(building_id)
        
        # Get summary data (this is what the frontend calls)
        summary = service.get_summary(month='2025-08')
        
        print(f"\n📊 API Response Summary:")
        print(f"   reserve_fund_goal: {summary.get('reserve_fund_goal')}")
        print(f"   reserve_fund_duration_months: {summary.get('reserve_fund_duration_months')}")
        print(f"   reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target')}")
        
        # Check the critical fields that were missing
        start_date = summary.get('reserve_fund_start_date')
        target_date = summary.get('reserve_fund_target_date')
        
        print(f"\n🔍 Critical Reserve Fund Timeline Fields:")
        print(f"   reserve_fund_start_date: {start_date}")
        print(f"   reserve_fund_target_date: {target_date}")
        
        # Verify the fix worked
        if start_date is not None:
            print(f"✅ SUCCESS: reserve_fund_start_date is now included in API response")
            print(f"   Value: {start_date} (type: {type(start_date)})")
        else:
            print(f"❌ FAILED: reserve_fund_start_date is still None")
        
        if target_date is not None:
            print(f"✅ SUCCESS: reserve_fund_target_date is now included in API response")
            print(f"   Value: {target_date} (type: {type(target_date)})")
        else:
            print(f"❌ FAILED: reserve_fund_target_date is still None")
        
        # Test timeline logic that frontend uses
        if start_date:
            try:
                selected_month = '2025-08'
                selected_date = datetime.strptime(selected_month + '-01', '%Y-%m-%d').date()
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                
                is_after_start = selected_date >= start_date_obj
                
                print(f"\n🔍 Frontend Timeline Logic Test:")
                print(f"   Selected month: {selected_month}")
                print(f"   Selected date: {selected_date}")
                print(f"   Start date: {start_date_obj}")
                print(f"   Is after start: {is_after_start}")
                
                if is_after_start:
                    print(f"✅ Timeline check PASSED - Reserve Fund should be displayed")
                else:
                    print(f"❌ Timeline check FAILED - Reserve Fund should NOT be displayed")
                    
            except Exception as e:
                print(f"❌ Error in timeline logic test: {e}")
        
        print(f"\n📋 Full Summary Keys:")
        for key in sorted(summary.keys()):
            if 'reserve' in key.lower():
                print(f"   {key}: {summary[key]}")

if __name__ == "__main__":
    test_reserve_fund_api_fix()
