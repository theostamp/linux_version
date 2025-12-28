#!/usr/bin/env python3
"""
Script to check all buildings and find which one has the expected reserve fund data
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_all_buildings():
    """Check all buildings for the expected reserve fund data"""
    
    with schema_context('demo'):
        buildings = Building.objects.all()
        
        print(f"🔍 Checking {buildings.count()} buildings for expected reserve fund data...")
        print("Expected values: Goal=10,000€, Duration=12 months, Monthly=833.33€")
        print("-" * 80)
        
        expected_values = {
            'goal': 10000.00,
            'duration': 12,
            'monthly': 833.33
        }
        
        for building in buildings:
            goal = float(building.reserve_fund_goal or 0)
            duration = building.reserve_fund_duration_months or 0
            monthly = goal / duration if duration > 0 else 0
            
            goal_match = abs(goal - expected_values['goal']) < 0.01
            duration_match = duration == expected_values['duration']
            monthly_match = abs(monthly - expected_values['monthly']) < 0.01
            
            print(f"🏢 {building.name} (ID: {building.id})")
            print(f"   - Στόχος: {goal:.2f}€ {'✅' if goal_match else '❌'}")
            print(f"   - Διάρκεια: {duration} μήνες {'✅' if duration_match else '❌'}")
            print(f"   - Μηνιαία: {monthly:.2f}€ {'✅' if monthly_match else '❌'}")
            
            if goal_match and duration_match and monthly_match:
                print("   🎉 MATCH FOUND! This building has the expected data!")
                print(f"   📍 Address: {building.address}")
                print(f"   🏠 Apartments: {building.apartments_count}")
                return building.id
            
            print()
        
        print("❌ No building found with the expected reserve fund data.")
        print("You may need to update the building settings or check if you're looking at the right building.")
        return None

if __name__ == '__main__':
    check_all_buildings()
