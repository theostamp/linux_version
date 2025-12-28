#!/usr/bin/env python3
"""
Test script to verify the reserve fund progress calculation
"""

import os
import sys
import django
from datetime import datetime, date

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import AdvancedCommonExpenseCalculator

def test_reserve_progress():
    """Test the reserve fund progress calculation"""
    
    with schema_context('demo'):
        # Get the Alkmanos building
        building = Building.objects.get(id=4)  # Αλκμάνος 22, Αθήνα 115 28
        
        print(f"🏢 Testing reserve fund progress for: {building.name}")
        print(f"   - ID: {building.id}")
        print(f"   - Στόχος: {building.reserve_fund_goal or 0}€")
        print(f"   - Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
        print(f"   - Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
        
        # Calculate advanced shares
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building.id,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=0
        )
        
        result = calculator.calculate_advanced_shares()
        
        # Get progress data
        goal = result.get('reserve_fund_goal', 0)
        duration = result.get('reserve_fund_duration', 1)
        current_reserve = result.get('current_reserve', 0)
        
        print("\n📊 Progress data:")
        print(f"   - Στόχος: {goal}€")
        print(f"   - Διάρκεια: {duration} μήνες")
        print(f"   - Τρέχον αποθεματικό: {current_reserve}€")
        
        # Calculate progress
        progress_percentage = (current_reserve / goal) * 100 if goal > 0 else 0
        
        # Calculate months elapsed and remaining
        current_date = datetime.now()
        start_date = building.reserve_fund_start_date or date(2025, 8, 1)
        
        months_elapsed = max(0, (current_date.year - start_date.year) * 12 + 
                           (current_date.month - start_date.month))
        months_remaining = max(0, duration - months_elapsed)
        
        print("\n📅 Timeline:")
        print(f"   - Ημερομηνία έναρξης: {start_date}")
        print(f"   - Τρέχουσα ημερομηνία: {current_date.strftime('%Y-%m-%d')}")
        print(f"   - Μήνες που έχουν περάσει: {months_elapsed}")
        print(f"   - Μήνες που απομένουν: {months_remaining}")
        
        print("\n📈 Progress:")
        print(f"   - Πρόοδος: {progress_percentage:.1f}%")
        print(f"   - Μαζεμένα χρήματα: {current_reserve:.2f}€")
        print(f"   - Απομένουν: {goal - current_reserve:.2f}€")
        
        # Expected values based on user data
        expected_values = {
            'goal': 2000.00,
            'duration': 6,
            'months_remaining': 6,  # Since we're in August 2025 and it started in August 2025
            'progress_percentage': 0.0  # No money collected yet
        }
        
        print("\n🎯 Expected vs Actual:")
        print(f"   - Στόχος: Expected {expected_values['goal']:.2f}€, Actual {goal:.2f}€")
        print(f"   - Διάρκεια: Expected {expected_values['duration']} μήνες, Actual {duration} μήνες")
        print(f"   - Μήνες απομένουν: Expected {expected_values['months_remaining']}, Actual {months_remaining}")
        print(f"   - Πρόοδος: Expected {expected_values['progress_percentage']:.1f}%, Actual {progress_percentage:.1f}%")
        
        # Check if all values match
        goal_match = abs(goal - expected_values['goal']) < 0.01
        duration_match = duration == expected_values['duration']
        months_remaining_match = months_remaining == expected_values['months_remaining']
        progress_match = abs(progress_percentage - expected_values['progress_percentage']) < 0.1
        
        print("\n✅ All matches:")
        print(f"   - Στόχος: {'✅' if goal_match else '❌'}")
        print(f"   - Διάρκεια: {'✅' if duration_match else '❌'}")
        print(f"   - Μήνες απομένουν: {'✅' if months_remaining_match else '❌'}")
        print(f"   - Πρόοδος: {'✅' if progress_match else '❌'}")
        
        if goal_match and duration_match and months_remaining_match and progress_match:
            print("\n🎉 SUCCESS: Reserve fund progress calculation is working correctly!")
            print("   The modal will show:")
            print(f"   - Μήνες Απομένουν: {months_remaining}")
            print(f"   - Μαζεμένα Χρήματα: {current_reserve:.2f}€")
            print(f"   - Πρόοδος: {progress_percentage:.1f}%")
        else:
            print("\n⚠️  WARNING: Some progress data does not match expected values.")

if __name__ == '__main__':
    test_reserve_progress()
