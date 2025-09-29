#!/usr/bin/env python3
"""
Script to fix the Alkmanos building with the correct user-entered data
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

def fix_alkmanos_correct_data():
    """Fix the Alkmanos building with the correct user-entered data"""
    
    with schema_context('demo'):
        # Find the Alkmanos building
        building = Building.objects.get(id=4)  # Αλκμάνος 22, Αθήνα 115 28
        
        print(f"🏢 Fixing building: {building.name}")
        print(f"   - Current ID: {building.id}")
        print(f"   - Current goal: {building.reserve_fund_goal or 0}€")
        print(f"   - Current duration: {building.reserve_fund_duration_months or 0} months")
        
        # Update to the correct user-entered values
        building.reserve_fund_goal = Decimal('2000.00')  # 2.000,00€ as entered by users
        building.reserve_fund_duration_months = 6  # 6 months as entered by users
        building.reserve_fund_start_date = date(2025, 8, 1)  # August 2025
        building.reserve_fund_target_date = date(2026, 1, 31)  # January 2026 (6 months later)
        
        building.save()
        
        print("\n✅ Fixed successfully!")
        print(f"   - New goal: {building.reserve_fund_goal}€")
        print(f"   - New duration: {building.reserve_fund_duration_months} months")
        print(f"   - Start date: {building.reserve_fund_start_date}")
        print(f"   - Target date: {building.reserve_fund_target_date}")
        
        # Calculate monthly amount
        monthly_amount = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
        print(f"   - Monthly amount: {monthly_amount:.2f}€")
        
        # Verify the fix
        print("\n🎯 Verification:")
        print("   - Expected goal: 2,000.00€")
        print("   - Expected duration: 6 months")
        print("   - Expected monthly: 333.33€")
        print(f"   - Actual goal: {building.reserve_fund_goal}€")
        print(f"   - Actual duration: {building.reserve_fund_duration_months} months")
        print(f"   - Actual monthly: {monthly_amount:.2f}€")
        
        goal_match = abs(float(building.reserve_fund_goal) - 2000.00) < 0.01
        duration_match = building.reserve_fund_duration_months == 6
        monthly_match = abs(monthly_amount - 333.33) < 0.01
        
        print("\n✅ All matches:")
        print(f"   - Goal: {'✅' if goal_match else '❌'}")
        print(f"   - Duration: {'✅' if duration_match else '❌'}")
        print(f"   - Monthly: {'✅' if monthly_match else '❌'}")
        
        if goal_match and duration_match and monthly_match:
            print("\n🎉 SUCCESS: Alkmanos building now has the correct user-entered data!")
            print("   The modal should now show:")
            print("   - Μηνιαία Εισφορά: 333,33€")
            print("   - Στόχος: 2.000,00€")
            print("   - Διάρκεια: 6 μήνες")
            print("   - Συνολική Εισφορά: 2.000,00€")
        else:
            print("\n⚠️  WARNING: Some values still don't match.")

if __name__ == '__main__':
    fix_alkmanos_correct_data()
