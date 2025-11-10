#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def debug_reserve_fund_start_date():
    """Debug Reserve Fund start date issue - check what's stored in database vs API response"""
    
    with schema_context('demo'):
        print("🔍 Debugging Reserve Fund Start Date Issue")
        print("=" * 60)
        
        # Check all buildings and their reserve fund settings
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏢 Building: {building.name} (ID: {building.id})")
            print(f"   Address: {building.address}")
            
            # Check raw database values
            print("\n📊 Raw Database Values:")
            print(f"   reserve_fund_goal: {building.reserve_fund_goal}")
            print(f"   reserve_fund_duration_months: {building.reserve_fund_duration_months}")
            print(f"   reserve_fund_start_date: {building.reserve_fund_start_date}")
            print(f"   reserve_fund_target_date: {building.reserve_fund_target_date}")
            
            # Check if dates are None or have values
            start_date = building.reserve_fund_start_date
            target_date = building.reserve_fund_target_date
            
            print("\n🔍 Date Analysis:")
            print(f"   start_date type: {type(start_date)}")
            print(f"   start_date value: {start_date}")
            print(f"   start_date is None: {start_date is None}")
            
            if start_date:
                print(f"   start_date formatted: {start_date.strftime('%Y-%m-%d')}")
            
            print(f"   target_date type: {type(target_date)}")
            print(f"   target_date value: {target_date}")
            print(f"   target_date is None: {target_date is None}")
            
            if target_date:
                print(f"   target_date formatted: {target_date.strftime('%Y-%m-%d')}")
            
            # Calculate monthly target if we have the data
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
                print(f"\n💰 Calculated Monthly Target: €{monthly_target:.2f}")
            else:
                print("\n💰 Cannot calculate monthly target - missing goal or duration")
            
            print("-" * 40)

if __name__ == "__main__":
    debug_reserve_fund_start_date()
