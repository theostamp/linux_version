#!/usr/bin/env python3
"""
Script to check the current reserve fund settings for the building
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_building_reserve_fund():
    """Check the current reserve fund settings for the building"""
    
    with schema_context('demo'):
        # Find the Alkmanos building (ID 1)
        building = Building.objects.get(id=1)  # Αλκμάνος 22, Αθήνα 115 28
        
        print("🔍 BUILDING RESERVE FUND ANALYSIS")
        print("=" * 50)
        print(f"🏢 Building: {building.name}")
        print(f"📍 Address: {building.address}")
        print()
        
        print("💰 RESERVE FUND SETTINGS:")
        print(f"   • Goal: {building.reserve_fund_goal or 0:,.2f}€")
        print(f"   • Duration: {building.reserve_fund_duration_months or 0} months")
        print(f"   • Start Date: {building.reserve_fund_start_date or 'Not set'}")
        print(f"   • Target Date: {building.reserve_fund_target_date or 'Not set'}")
        print(f"   • Per Apartment Contribution: {building.reserve_contribution_per_apartment or 0:,.2f}€")
        print()
        
        # Calculate monthly target
        monthly_target = 0
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
        print(f"📊 Calculated Monthly Target: {monthly_target:,.2f}€")
        print()
        
        # Check if April 2024 should have reserve fund
        if building.reserve_fund_start_date:
            april_2024 = date(2024, 4, 1)
            print(f"📅 April 2024 date: {april_2024}")
            print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
            print(f"📅 Should collect in April 2024: {april_2024 >= building.reserve_fund_start_date}")
            print()
            
            if april_2024 < building.reserve_fund_start_date:
                print("✅ CORRECT: Reserve fund should NOT be collected in April 2024")
            else:
                print("❌ ISSUE: Reserve fund should be collected in April 2024")
        else:
            print("⚠️ WARNING: Reserve fund start date is not set!")
        
        print()
        print("=" * 50)

if __name__ == '__main__':
    check_building_reserve_fund()
