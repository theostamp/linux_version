#!/usr/bin/env python3
"""
Test script to verify that reserve fund data is correctly passed to the CommonExpenseModal
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
from financial.services import AdvancedCommonExpenseCalculator

def test_reserve_fund_modal_data():
    """Test that reserve fund data is correctly passed to the modal"""
    
    with schema_context('demo'):
        # Get the building
        building = Building.objects.get(id=3)  # Assuming building ID 3 exists
        
        print(f"🏢 Testing building: {building.name}")
        print(f"   - ID: {building.id}")
        print(f"   - Στόχος: {building.reserve_fund_goal or 0}€")
        print(f"   - Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
        print(f"   - Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
        print(f"   - Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
        
        # Calculate advanced shares
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building.id,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=0  # Will be calculated from building settings
        )
        
        result = calculator.calculate_advanced_shares()
        
        print("\n📊 Advanced calculation result:")
        print(f"   - reserve_fund_goal: {result.get('reserve_fund_goal', 'N/A')}€")
        print(f"   - reserve_fund_duration: {result.get('reserve_fund_duration', 'N/A')} μήνες")
        print(f"   - reserve_contribution: {result.get('reserve_contribution', 'N/A')}€")
        
        # Check if the data matches the building settings
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            actual_monthly = result.get('reserve_contribution', 0)
            
            print("\n✅ Verification:")
            print(f"   - Expected monthly: {expected_monthly:.2f}€")
            print(f"   - Actual monthly: {actual_monthly:.2f}€")
            print(f"   - Match: {'✅' if abs(expected_monthly - actual_monthly) < 0.01 else '❌'}")
        
        # Test the modal data structure
        print("\n🎯 Modal data structure:")
        print(f"   - state.advancedShares.reserve_fund_goal: {result.get('reserve_fund_goal', 0)}€")
        print(f"   - state.advancedShares.reserve_fund_duration: {result.get('reserve_fund_duration', 0)} μήνες")
        print(f"   - state.advancedShares.reserve_contribution: {result.get('reserve_contribution', 0)}€")
        
        # Calculate what the modal should display
        goal = result.get('reserve_fund_goal', 0)
        duration = result.get('reserve_fund_duration', 1)
        monthly_amount = result.get('reserve_contribution', 0)
        total_contribution = monthly_amount * len(calculator.apartments)
        
        print("\n📋 Modal display data:")
        print(f"   - Μηνιαία Εισφορά: {monthly_amount:.2f}€")
        print(f"   - Στόχος: {goal:.2f}€")
        print(f"   - Διάρκεια: {duration} μήνες")
        print(f"   - Συνολική Εισφορά: {total_contribution:.2f}€")
        
        # Check if this matches the expected values from the user's message
        expected_values = {
            'monthly_amount': 833.33,
            'goal': 10000.00,
            'duration': 12,
            'total_contribution': 8333.33
        }
        
        print("\n🎯 Expected vs Actual:")
        print(f"   - Μηνιαία Εισφορά: Expected {expected_values['monthly_amount']:.2f}€, Actual {monthly_amount:.2f}€")
        print(f"   - Στόχος: Expected {expected_values['goal']:.2f}€, Actual {goal:.2f}€")
        print(f"   - Διάρκεια: Expected {expected_values['duration']} μήνες, Actual {duration} μήνες")
        print(f"   - Συνολική Εισφορά: Expected {expected_values['total_contribution']:.2f}€, Actual {total_contribution:.2f}€")
        
        # Check if all values match
        monthly_match = abs(monthly_amount - expected_values['monthly_amount']) < 0.01
        goal_match = abs(goal - expected_values['goal']) < 0.01
        duration_match = duration == expected_values['duration']
        total_match = abs(total_contribution - expected_values['total_contribution']) < 0.01
        
        print("\n✅ All matches:")
        print(f"   - Μηνιαία Εισφορά: {'✅' if monthly_match else '❌'}")
        print(f"   - Στόχος: {'✅' if goal_match else '❌'}")
        print(f"   - Διάρκεια: {'✅' if duration_match else '❌'}")
        print(f"   - Συνολική Εισφορά: {'✅' if total_match else '❌'}")
        
        if monthly_match and goal_match and duration_match and total_match:
            print("\n🎉 SUCCESS: All reserve fund data matches the expected values!")
        else:
            print("\n⚠️  WARNING: Some reserve fund data does not match the expected values.")
            print("   This means the modal may not display the correct data for the right building.")

if __name__ == '__main__':
    test_reserve_fund_modal_data()
