#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app' if os.path.exists('/app') else '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator

def test_reserve_fund_timeline_data():
    """Test if Reserve Fund timeline data is included in API response"""
    
    with schema_context('demo'):
        print("🔍 Testing Reserve Fund timeline data in API response...")
        
        # Test with Alkmanos building (ID 2) for April 2025
        building_id = 2
        
        # First check if building exists
        from buildings.models import Building
        try:
            building = Building.objects.get(id=building_id)
            print(f"   Building found: {building.name}")
        except Building.DoesNotExist:
            print(f"   Building ID {building_id} not found, trying building ID 1...")
            building_id = 1
            building = Building.objects.get(id=building_id)
            print(f"   Building found: {building.name}")
        
        # Check building's Reserve Fund settings
        print("\n🔍 Building Reserve Fund Settings:")
        print(f"   reserve_fund_start_date: {building.reserve_fund_start_date}")
        print(f"   reserve_fund_target_date: {building.reserve_fund_target_date}")
        print(f"   reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-04-01',
            period_end_date='2025-04-30',
            reserve_fund_monthly_total=0  # Let it calculate from building settings
        )
        
        result = calculator.calculate_advanced_shares()
        
        print("\n📊 API Response Analysis:")
        print(f"   Building ID: {building_id}")
        print("   Selected Month: 2025-04")
        print(f"   Response Keys: {list(result.keys())}")
        
        # Check Reserve Fund timeline fields
        reserve_start = result.get('reserve_fund_start_date')
        reserve_target = result.get('reserve_fund_target_date')
        reserve_goal = result.get('reserve_fund_goal')
        reserve_duration = result.get('reserve_fund_duration_months')
        
        print("\n🔍 Reserve Fund Timeline Data:")
        print(f"   reserve_fund_start_date: {reserve_start}")
        print(f"   reserve_fund_target_date: {reserve_target}")
        print(f"   reserve_fund_goal: {reserve_goal}")
        print(f"   reserve_fund_duration_months: {reserve_duration}")
        
        # Check if timeline data exists
        if reserve_start and reserve_target:
            print("\n✅ Timeline data is present in API response")
            
            # Check timeline logic for April 2025
            from datetime import date
            selected_date = date(2025, 4, 1)
            start_date = date.fromisoformat(reserve_start)
            target_date = date.fromisoformat(reserve_target)
            
            is_after_start = selected_date >= start_date
            is_before_end = selected_date <= target_date
            
            print("\n📅 Timeline Check for April 2025:")
            print(f"   Selected Date: {selected_date}")
            print(f"   Start Date: {start_date}")
            print(f"   Target Date: {target_date}")
            print(f"   Is After Start: {is_after_start}")
            print(f"   Is Before End: {is_before_end}")
            print(f"   Should Show Reserve Fund: {is_after_start and is_before_end}")
            
        else:
            print("\n❌ Timeline data is missing from API response")
            print("   This explains why frontend shows Reserve Fund in April 2025")
        
        # Check Reserve Fund calculation for April vs July
        print("\n🔍 Reserve Fund Calculation Check:")
        reserve_monthly = result.get('reserve_fund_monthly_target', 0)
        print(f"   Monthly Target: {reserve_monthly}€")
        
        if reserve_monthly > 0 and not (reserve_start and reserve_target):
            print("   ⚠️  Reserve Fund shows amount but no timeline validation!")

if __name__ == '__main__':
    test_reserve_fund_timeline_data()
