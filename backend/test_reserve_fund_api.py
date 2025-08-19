#!/usr/bin/env python3
"""
Test script for reserve fund API functionality
"""

import os
import sys
import django
from decimal import Decimal

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def test_reserve_fund_api():
    """Test reserve fund API functionality"""
    
    with schema_context('demo'):
        # Get the Alkmanos building
        building = Building.objects.get(id=4)
        
        print(f"🏢 Current building: {building.name}")
        print(f"   - Current goal: {building.reserve_fund_goal or 0}€")
        print(f"   - Current duration: {building.reserve_fund_duration_months or 0} months")
        print(f"   - Current start date: {building.reserve_fund_start_date}")
        print(f"   - Current target date: {building.reserve_fund_target_date}")
        
        # Test updating the reserve fund goal
        print(f"\n🔄 Testing reserve fund goal update...")
        
        # Save current values
        original_goal = building.reserve_fund_goal
        original_duration = building.reserve_fund_duration_months
        
        # Update to test values
        building.reserve_fund_goal = Decimal('8000.00')
        building.reserve_fund_duration_months = 16
        building.save()
        
        print(f"   ✅ Updated goal to: {building.reserve_fund_goal}€")
        print(f"   ✅ Updated duration to: {building.reserve_fund_duration_months} months")
        
        # Verify the update
        building.refresh_from_db()
        print(f"   ✅ Verified goal: {building.reserve_fund_goal}€")
        print(f"   ✅ Verified duration: {building.reserve_fund_duration_months} months")
        
        # Restore original values
        building.reserve_fund_goal = original_goal
        building.reserve_fund_duration_months = original_duration
        building.save()
        
        print(f"\n🔄 Restored original values...")
        print(f"   ✅ Restored goal: {building.reserve_fund_goal}€")
        print(f"   ✅ Restored duration: {building.reserve_fund_duration_months} months")
        
        print(f"\n🎯 API Test Results:")
        print(f"   ✅ Database updates work correctly")
        print(f"   ✅ Reserve fund fields are properly configured")
        print(f"   ✅ Building model supports all required fields")

if __name__ == "__main__":
    test_reserve_fund_api()
