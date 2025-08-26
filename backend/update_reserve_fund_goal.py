#!/usr/bin/env python3
"""
Script to update reserve fund goal to 2000€ and duration to 12 months
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
from decimal import Decimal

def update_reserve_fund_settings():
    """Update reserve fund goal and duration"""
    
    with schema_context('demo'):
        building = Building.objects.first()
        
        print("🔧 UPDATING RESERVE FUND SETTINGS")
        print("=" * 50)
        
        print(f"🏢 Building: {building.name}")
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
        
        # Update to user's requirements
        new_goal = Decimal('2000.00')
        new_duration = 12
        
        print("🔄 UPDATING TO:")
        print(f"   • New Goal: {new_goal}€")
        print(f"   • New Duration: {new_duration} months")
        
        # Calculate new monthly target
        new_monthly = new_goal / new_duration
        print(f"   • New Monthly Target: {new_monthly:.2f}€")
        print()
        
        # Update the building settings
        building.reserve_fund_goal = new_goal
        building.reserve_fund_duration_months = new_duration
        building.save()
        
        print("✅ SETTINGS UPDATED SUCCESSFULLY!")
        print()
        
        # Verify the update
        building.refresh_from_db()
        print("📊 VERIFIED NEW SETTINGS:")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            verified_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"   • Monthly Target: {verified_monthly:.2f}€")
        
        print("=" * 50)

if __name__ == "__main__":
    update_reserve_fund_settings()
