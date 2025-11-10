#!/usr/bin/env python3
"""
Debug script για να δούμε τι ακριβώς αποθηκεύεται στη βάση για το αποθεματικό
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense
from datetime import datetime, timedelta

def debug_reserve_fund_dates():
    """Debug reserve fund dates"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Reserve Fund Dates")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 BUILDING MODEL FIELDS:")
        print(f"   • reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   • reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   • reserve_fund_start_date: {building.reserve_fund_start_date}")
        print(f"   • reserve_fund_target_date: {building.reserve_fund_target_date}")
        print(f"   • reserve_fund_priority: {building.reserve_fund_priority}")
        
        # Calculate expected dates
        if building.reserve_fund_start_date and building.reserve_fund_duration_months:
            start_date = building.reserve_fund_start_date
            end_date = start_date + timedelta(days=30 * building.reserve_fund_duration_months)
            
            print(f"\n📅 CALCULATED DATES:")
            print(f"   • Start: {start_date}")
            print(f"   • Duration: {building.reserve_fund_duration_months} months")
            print(f"   • Expected End: {end_date}")
            
            # Show which months should be active
            print(f"\n📋 EXPECTED ACTIVE MONTHS:")
            current_date = start_date
            for i in range(building.reserve_fund_duration_months):
                month_name = current_date.strftime('%B %Y')
                print(f"   • {i+1}η: {month_name}")
                current_date = current_date + timedelta(days=30)
        
        # Check actual expenses
        print(f"\n💰 ACTUAL EXPENSES:")
        expenses = Expense.objects.filter(
            building=building,
            expense_type='reserve_fund'
        ).order_by('created_at')
        
        if expenses.exists():
            for exp in expenses:
                print(f"   • {exp.title}: {exp.amount} (created: {exp.created_at.strftime('%Y-%m-%d')})")
        else:
            print("   • No reserve fund expenses found")
        
        # Check if there's a mismatch
        print(f"\n🔍 ANALYSIS:")
        if building.reserve_fund_start_date and building.reserve_fund_duration_months:
            start_date = building.reserve_fund_start_date
            expected_end = start_date + timedelta(days=30 * building.reserve_fund_duration_months)
            
            print(f"   • Stored start: {start_date}")
            print(f"   • Stored target: {building.reserve_fund_target_date}")
            print(f"   • Calculated end: {expected_end}")
            
            if building.reserve_fund_target_date != expected_end:
                print(f"   ⚠️  MISMATCH: Stored target date doesn't match calculated end date!")
            else:
                print(f"   ✅ Dates are consistent")
        
        # Check if expenses are created for the right months
        print(f"\n📊 EXPENSE MONTHS ANALYSIS:")
        if expenses.exists():
            expense_months = set()
            for exp in expenses:
                # Extract month from title
                if 'September' in exp.title:
                    expense_months.add('September 2025')
                elif 'August' in exp.title:
                    expense_months.add('August 2025')
                elif 'October' in exp.title:
                    expense_months.add('October 2025')
                elif 'November' in exp.title:
                    expense_months.add('November 2025')
            
            print(f"   • Expense months: {sorted(expense_months)}")
            
            # Expected months based on stored dates
            if building.reserve_fund_start_date and building.reserve_fund_duration_months:
                expected_months = []
                current_date = building.reserve_fund_start_date
                for i in range(building.reserve_fund_duration_months):
                    month_name = current_date.strftime('%B %Y')
                    expected_months.append(month_name)
                    current_date = current_date + timedelta(days=30)
                
                print(f"   • Expected months: {expected_months}")
                
                if set(expense_months) != set(expected_months):
                    print(f"   ⚠️  MISMATCH: Expense months don't match expected months!")
                else:
                    print(f"   ✅ Expense months match expected months")

if __name__ == "__main__":
    debug_reserve_fund_dates()
