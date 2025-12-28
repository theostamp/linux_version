#!/usr/bin/env python3
"""
Debug script για να δούμε γιατί το monthly_target είναι 0
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator
from buildings.models import Building

def debug_monthly_target():
    """Debug monthly target calculation"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Monthly Target Calculation")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 BUILDING DATA:")
        print(f"   • reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   • reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   • reserve_fund_start_date: {building.reserve_fund_start_date}")
        print(f"   • reserve_fund_target_date: {building.reserve_fund_target_date}")
        
        # Calculate expected monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = float(building.reserve_fund_goal) / building.reserve_fund_duration_months
            print(f"   • Expected monthly target: €{expected_monthly}")
        
        # Test calculator for March 2025
        print(f"\n🧮 CALCULATOR TEST FOR MARCH 2025:")
        calculator = AdvancedCommonExpenseCalculator(building_id=1)
        calculator.month = '2025-03'
        
        # Check if reserve fund should be collected
        print(f"   • Month: {calculator.month}")
        print(f"   • Building priority: {building.reserve_fund_priority}")
        
        # Check reserve fund contribution calculation
        # We need to call calculate_advanced_shares to get the monthly target
        shares = calculator.calculate_advanced_shares()
        print(f"   • Shares calculated successfully")
        
        # Check if month is in timeline manually
        from datetime import date, timedelta
        year, month = map(int, calculator.month.split('-'))
        expense_date = date(year, month, 1)
        
        # Manual check
        if building.reserve_fund_start_date and building.reserve_fund_duration_months:
            start_date = building.reserve_fund_start_date
            end_date = start_date + timedelta(days=30 * building.reserve_fund_duration_months)
            is_in_timeline = start_date <= expense_date < end_date
            print(f"   • Is March 2025 in timeline: {is_in_timeline}")
            print(f"   • Timeline: {start_date} to {end_date}")
        else:
            print(f"   • No timeline configured")
        
        # Check priority logic
        if building.reserve_fund_priority == 'after_obligations':
            print(f"   • Priority: after_obligations - checking for existing obligations")
            # Check if there are existing obligations
            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building=building)
            total_obligations = sum(abs(apt.current_balance) for apt in apartments if apt.current_balance and apt.current_balance < 0)
            print(f"   • Total existing obligations: €{total_obligations}")
            
            if total_obligations > 0:
                print(f"   • ⚠️  Reserve fund NOT collected due to existing obligations")
            else:
                print(f"   • ✅ Reserve fund CAN be collected (no existing obligations)")
        else:
            print(f"   • Priority: always - reserve fund should be collected")

if __name__ == "__main__":
    debug_monthly_target()
