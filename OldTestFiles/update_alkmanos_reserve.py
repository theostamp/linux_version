#!/usr/bin/env python3
"""
Script to update the reserve fund data for the Alkmanos building
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
from datetime import date

def update_alkmanos_reserve():
    """Update the reserve fund data for the Alkmanos building"""
    
    with schema_context('demo'):
        # Find the Alkmanos building
        building = Building.objects.get(id=4)  # Αλκμάνος 22, Αθήνα 115 28
        
        print(f"🏢 Updating building: {building.name}")
        print(f"   - Current ID: {building.id}")
        print(f"   - Current goal: {building.reserve_fund_goal or 0}€")
        print(f"   - Current duration: {building.reserve_fund_duration_months or 0} months")
        
        # Update to the expected values
        building.reserve_fund_goal = Decimal('10000.00')
        building.reserve_fund_duration_months = 12
        building.reserve_fund_start_date = date(2025, 8, 1)
        building.reserve_fund_target_date = date(2026, 7, 31)
        
        building.save()
        
        print(f"\n✅ Updated successfully!")
        print(f"   - New goal: {building.reserve_fund_goal}€")
        print(f"   - New duration: {building.reserve_fund_duration_months} months")
        print(f"   - Start date: {building.reserve_fund_start_date}")
        print(f"   - Target date: {building.reserve_fund_target_date}")
        
        # Calculate monthly amount
        monthly_amount = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
        print(f"   - Monthly amount: {monthly_amount:.2f}€")
        
        # Verify the update
        print(f"\n🎯 Verification:")
        print(f"   - Expected goal: 10,000.00€")
        print(f"   - Expected duration: 12 months")
        print(f"   - Expected monthly: 833.33€")
        print(f"   - Actual goal: {building.reserve_fund_goal}€")
        print(f"   - Actual duration: {building.reserve_fund_duration_months} months")
        print(f"   - Actual monthly: {monthly_amount:.2f}€")
        
        goal_match = abs(float(building.reserve_fund_goal) - 10000.00) < 0.01
        duration_match = building.reserve_fund_duration_months == 12
        monthly_match = abs(monthly_amount - 833.33) < 0.01
        
        print(f"\n✅ All matches:")
        print(f"   - Goal: {'✅' if goal_match else '❌'}")
        print(f"   - Duration: {'✅' if duration_match else '❌'}")
        print(f"   - Monthly: {'✅' if monthly_match else '❌'}")
        
        if goal_match and duration_match and monthly_match:
            print(f"\n🎉 SUCCESS: Alkmanos building now has the correct reserve fund data!")
        else:
            print(f"\n⚠️  WARNING: Some values still don't match.")

if __name__ == '__main__':
    update_alkmanos_reserve()
