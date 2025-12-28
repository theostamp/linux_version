#!/usr/bin/env python3
"""
Debug script για να δούμε αν καλείται η μέθοδος _calculate_reserve_fund_contribution
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

def debug_method_calls():
    """Debug method calls"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Method Calls")
        print("=" * 40)
        
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 BUILDING DATA:")
        print(f"   • reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   • reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   • reserve_fund_priority: {building.reserve_fund_priority}")
        
        # Test calculator for March 2025
        print(f"\n🧮 CALCULATOR TEST FOR MARCH 2025:")
        calculator = AdvancedCommonExpenseCalculator(building_id=1)
        calculator.month = '2025-03'
        
        print(f"   • period_end_date: {calculator.period_end_date}")
        print(f"   • month: {calculator.month}")
        
        # Check if reserve fund should be collected
        print(f"\n🔍 CHECKING RESERVE FUND CONDITIONS:")
        
        # Check if there's a goal
        if not building.reserve_fund_goal or building.reserve_fund_goal <= 0:
            print(f"   • ❌ No reserve fund goal")
        else:
            print(f"   • ✅ Reserve fund goal: €{building.reserve_fund_goal}")
        
        # Check if collection has started
        if not building.reserve_fund_start_date:
            print(f"   • ❌ No reserve fund start date")
        else:
            print(f"   • ✅ Reserve fund start date: {building.reserve_fund_start_date}")
        
        # Check if month is in timeline
        if calculator.month:
            from datetime import date
            try:
                year, mon = map(int, calculator.month.split('-'))
                selected_month_date = date(year, mon, 1)
                
                # Check if selected month is before start
                if selected_month_date < building.reserve_fund_start_date:
                    print(f"   • ❌ Month {calculator.month} is before start date")
                else:
                    print(f"   • ✅ Month {calculator.month} is after start date")
                
                # Check if selected month is after target
                if (building.reserve_fund_target_date and 
                    selected_month_date > building.reserve_fund_target_date):
                    print(f"   • ❌ Month {calculator.month} is after target date")
                else:
                    print(f"   • ✅ Month {calculator.month} is before target date")
                    
            except Exception as e:
                print(f"   • ❌ Error parsing month {calculator.month}: {e}")
        
        # Check priority logic
        if building.reserve_fund_priority == 'after_obligations':
            print(f"   • Priority: after_obligations - checking for existing obligations")
            # Check if there are existing obligations
            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building=building)
            total_obligations = sum(abs(apt.current_balance) for apt in apartments if apt.current_balance and apt.current_balance < 0)
            print(f"   • Total existing obligations: €{total_obligations}")
            
            if total_obligations > 0:
                print(f"   • ❌ Reserve fund NOT collected due to existing obligations")
            else:
                print(f"   • ✅ Reserve fund CAN be collected (no existing obligations)")
        else:
            print(f"   • Priority: always - reserve fund should be collected")
        
        # Check reserve fund contribution calculation
        print(f"\n🧮 CALCULATING SHARES:")
        shares = calculator.calculate_advanced_shares()
        print(f"   • Shares calculated successfully")
        
        # Check if any apartment has reserve fund contribution
        total_reserve_fund = 0
        for apt_id, share in shares.items():
            if isinstance(share, dict) and 'reserve_fund_amount' in share:
                total_reserve_fund += share['reserve_fund_amount']
        
        print(f"   • Total reserve fund from shares: €{total_reserve_fund}")

if __name__ == "__main__":
    debug_method_calls()
