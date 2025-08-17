#!/usr/bin/env python3
"""
Final test to verify the modal shows the correct user-entered data for Alkmanos building
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
from financial.services import AdvancedCommonExpenseCalculator

def test_alkmanos_final():
    """Final test to verify the modal shows the correct user-entered data"""
    
    with schema_context('demo'):
        # Get the Alkmanos building
        building = Building.objects.get(id=4)  # Αλκμάνος 22, Αθήνα 115 28
        
        print(f"🏢 Final test for Alkmanos building: {building.name}")
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
        
        print(f"\n📊 Advanced calculation result:")
        print(f"   - reserve_fund_goal: {result.get('reserve_fund_goal', 'N/A')}€")
        print(f"   - reserve_fund_duration: {result.get('reserve_fund_duration', 'N/A')} μήνες")
        print(f"   - reserve_contribution: {result.get('reserve_contribution', 'N/A')}€")
        
        # Calculate what the modal should display
        goal = result.get('reserve_fund_goal', 0)
        duration = result.get('reserve_fund_duration', 1)
        monthly_amount = result.get('reserve_contribution', 0)
        total_contribution = monthly_amount * len(calculator.apartments)
        
        print(f"\n📋 Modal display data:")
        print(f"   - Μηνιαία Εισφορά: {monthly_amount:.2f}€")
        print(f"   - Στόχος: {goal:.2f}€")
        print(f"   - Διάρκεια: {duration} μήνες")
        print(f"   - Συνολική Εισφορά: {total_contribution:.2f}€")
        
        # Check if this matches the user-entered values
        expected_values = {
            'monthly_amount': 333.33,
            'goal': 2000.00,
            'duration': 6,
            'total_contribution': 2000.00  # 333.33 * 6 months
        }
        
        print(f"\n🎯 Expected vs Actual (User-entered data):")
        print(f"   - Μηνιαία Εισφορά: Expected {expected_values['monthly_amount']:.2f}€, Actual {monthly_amount:.2f}€")
        print(f"   - Στόχος: Expected {expected_values['goal']:.2f}€, Actual {goal:.2f}€")
        print(f"   - Διάρκεια: Expected {expected_values['duration']} μήνες, Actual {duration} μήνες")
        print(f"   - Συνολική Εισφορά: Expected {expected_values['total_contribution']:.2f}€, Actual {total_contribution:.2f}€")
        
        # Check if all values match
        monthly_match = abs(monthly_amount - expected_values['monthly_amount']) < 0.01
        goal_match = abs(goal - expected_values['goal']) < 0.01
        duration_match = duration == expected_values['duration']
        total_match = abs(total_contribution - expected_values['total_contribution']) < 0.01
        
        print(f"\n✅ All matches:")
        print(f"   - Μηνιαία Εισφορά: {'✅' if monthly_match else '❌'}")
        print(f"   - Στόχος: {'✅' if goal_match else '❌'}")
        print(f"   - Διάρκεια: {'✅' if duration_match else '❌'}")
        print(f"   - Συνολική Εισφορά: {'✅' if total_match else '❌'}")
        
        if monthly_match and goal_match and duration_match and total_match:
            print(f"\n🎉 SUCCESS: The modal will display the correct user-entered data!")
            print(f"   The reserve fund section should show:")
            print(f"   - Μηνιαία Εισφορά: 333,33€")
            print(f"   - Στόχος: 2.000,00€")
            print(f"   - Διάρκεια: 6 μήνες")
            print(f"   - Συνολική Εισφορά: 2.000,00€")
            print(f"\n✅ This matches exactly what the users have entered!")
        else:
            print(f"\n⚠️  WARNING: Some reserve fund data does not match the user-entered values.")

if __name__ == '__main__':
    test_alkmanos_final()
