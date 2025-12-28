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

def debug_monthly_target_detailed():
    """Debug monthly target in detail"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Monthly Target Detailed")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 BUILDING DATA:")
        print(f"   • reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   • reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   • reserve_fund_priority: {building.reserve_fund_priority}")
        
        # Calculate expected monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = float(building.reserve_fund_goal) / building.reserve_fund_duration_months
            print(f"   • Expected monthly target: €{expected_monthly}")
        
        # Test calculator for March 2025
        print(f"\n🧮 CALCULATOR TEST FOR MARCH 2025:")
        calculator = AdvancedCommonExpenseCalculator(building_id=1)
        calculator.month = '2025-03'
        
        # Check reserve fund contribution calculation
        shares = calculator.calculate_advanced_shares()
        print(f"   • Shares calculated successfully")
        
        # Check if any apartment has reserve fund contribution
        total_reserve_fund = 0
        for apt_id, share in shares.items():
            if isinstance(share, dict) and 'reserve_fund_amount' in share:
                total_reserve_fund += share['reserve_fund_amount']
        
        print(f"   • Total reserve fund from shares: €{total_reserve_fund}")
        
        # Check if month is in timeline
        from datetime import date, timedelta
        year, month = map(int, calculator.month.split('-'))
        expense_date = date(year, month, 1)
        
        if building.reserve_fund_start_date and building.reserve_fund_duration_months:
            start_date = building.reserve_fund_start_date
            end_date = start_date + timedelta(days=30 * building.reserve_fund_duration_months)
            
            # New logic (month comparison)
            target_year_month = (expense_date.year, expense_date.month)
            start_year_month = (start_date.year, start_date.month)
            end_year_month = (end_date.year, end_date.month)
            is_in_timeline = start_year_month <= target_year_month < end_year_month
            
            print(f"   • Is March 2025 in timeline: {is_in_timeline}")
            print(f"   • Timeline: {start_year_month} to {end_year_month}")
        
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
        
        # Check if expenses were created
        from financial.models import Expense
        expenses = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund',
            date__year=2025,
            date__month=3
        )
        print(f"   • Expenses created for March 2025: {expenses.count()}")

if __name__ == "__main__":
    debug_monthly_target_detailed()
