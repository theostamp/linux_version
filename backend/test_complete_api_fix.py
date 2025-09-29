#!/usr/bin/env python3

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from financial.serializers import FinancialSummarySerializer

def test_complete_api_fix():
    """Test the complete API fix - both service and serializer"""
    
    with schema_context('demo'):
        print("🔍 Testing Complete API Fix")
        print("=" * 60)
        
        building_id = 1
        
        # Test 1: FinancialDashboardService
        print("🔧 Test 1: FinancialDashboardService.get_summary()")
        service = FinancialDashboardService(building_id)
        summary = service.get_summary(month='2025-08')
        
        print(f"   reserve_fund_start_date: {summary.get('reserve_fund_start_date')}")
        print(f"   reserve_fund_target_date: {summary.get('reserve_fund_target_date')}")
        print(f"   reserve_fund_goal: {summary.get('reserve_fund_goal')}")
        print(f"   reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target')}")
        
        # Test 2: FinancialSummarySerializer
        print("\n📋 Test 2: FinancialSummarySerializer")
        serializer = FinancialSummarySerializer(summary)
        serialized_data = serializer.data
        
        print(f"   reserve_fund_start_date: {serialized_data.get('reserve_fund_start_date')}")
        print(f"   reserve_fund_target_date: {serialized_data.get('reserve_fund_target_date')}")
        print(f"   reserve_fund_goal: {serialized_data.get('reserve_fund_goal')}")
        print(f"   reserve_fund_monthly_target: {serialized_data.get('reserve_fund_monthly_target')}")
        
        # Test 3: Frontend timeline logic simulation
        print("\n🎯 Test 3: Frontend Timeline Logic Simulation")
        
        start_date = serialized_data.get('reserve_fund_start_date')
        target_date = serialized_data.get('reserve_fund_target_date')
        monthly_target = serialized_data.get('reserve_fund_monthly_target', 0)
        
        if start_date and monthly_target > 0:
            selected_month = '2025-08'
            selected_date = datetime.strptime(selected_month + '-01', '%Y-%m-%d').date()
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date() if target_date else None
            
            is_after_start = selected_date >= start_date_obj
            is_before_end = not target_date_obj or selected_date <= target_date_obj
            is_within_period = is_after_start and is_before_end
            
            condition1 = monthly_target > 0
            condition2 = is_within_period
            should_display = condition1 and condition2
            
            print(f"   Selected month: {selected_month}")
            print(f"   Start date: {start_date} -> {start_date_obj}")
            print(f"   Target date: {target_date} -> {target_date_obj}")
            print(f"   Is after start: {is_after_start}")
            print(f"   Is before end: {is_before_end}")
            print(f"   Is within period: {is_within_period}")
            print(f"   Monthly target > 0: {condition1}")
            print(f"   Should display Reserve Fund: {should_display}")
            
            if should_display:
                print("   ✅ SUCCESS: Reserve Fund should be displayed in frontend")
                print(f"   💰 Monthly Target: €{monthly_target:.2f}")
            else:
                print("   ❌ FAILED: Reserve Fund should NOT be displayed")
        else:
            print("   ❌ FAILED: Missing start date or monthly target")
            print(f"   start_date: {start_date}")
            print(f"   monthly_target: {monthly_target}")
        
        # Test 4: Check all reserve fund keys in serialized data
        print("\n📊 Test 4: All Reserve Fund Keys in Serialized Data")
        all_keys = list(serialized_data.keys())
        reserve_keys = [k for k in all_keys if 'reserve' in k.lower()]
        print(f"   Reserve fund keys: {reserve_keys}")
        
        for key in reserve_keys:
            print(f"   {key}: {serialized_data.get(key)}")

if __name__ == "__main__":
    test_complete_api_fix()
