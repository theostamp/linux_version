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

def test_frontend_reserve_fund_display():
    """Test Reserve Fund display conditions that frontend uses"""
    
    with schema_context('demo'):
        print("🔍 Testing Frontend Reserve Fund Display Logic")
        print("=" * 60)
        
        building_id = 1
        service = FinancialDashboardService(building_id)
        
        # Test different months to verify timeline logic
        test_months = ['2025-06', '2025-07', '2025-08', '2025-09', '2026-01', '2026-02']
        
        for month in test_months:
            print(f"\n📅 Testing Month: {month}")
            
            summary = service.get_summary(month=month)
            
            start_date = summary.get('reserve_fund_start_date')
            target_date = summary.get('reserve_fund_target_date')
            monthly_target = summary.get('reserve_fund_monthly_target', 0)
            
            # Frontend logic simulation
            if not month or not start_date:
                should_display = False
                reason = "No month or start date"
            else:
                try:
                    selected_date = datetime.strptime(month + '-01', '%Y-%m-%d').date()
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date() if target_date else None
                    
                    is_after_start = selected_date >= start_date_obj
                    is_before_end = not target_date_obj or selected_date <= target_date_obj
                    is_within_period = is_after_start and is_before_end
                    
                    condition1 = monthly_target > 0
                    condition2 = is_within_period
                    
                    should_display = condition1 and condition2
                    
                    if not condition1:
                        reason = f"Monthly target is 0: {monthly_target}"
                    elif not condition2:
                        if not is_after_start:
                            reason = f"Before start date: {selected_date} < {start_date_obj}"
                        elif not is_before_end:
                            reason = f"After end date: {selected_date} > {target_date_obj}"
                        else:
                            reason = "Unknown timeline issue"
                    else:
                        reason = "All conditions met"
                        
                except Exception as e:
                    should_display = False
                    reason = f"Error: {e}"
            
            status = "✅ DISPLAY" if should_display else "❌ HIDE"
            print(f"   {status} - {reason}")
            
            if should_display:
                print(f"   💰 Monthly Target: €{monthly_target:.2f}")
        
        print(f"\n🔍 Summary:")
        print(f"   Reserve Fund should display for August 2025: ✅")
        print(f"   Reserve Fund should hide before July 2025: ❌") 
        print(f"   Reserve Fund should hide after January 2026: ❌")

if __name__ == "__main__":
    test_frontend_reserve_fund_display()
