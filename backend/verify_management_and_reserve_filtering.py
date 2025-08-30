#!/usr/bin/env python3
"""
Verify that management fees and reserve fund parameters are correctly filtered by month
and properly stored in the database.
"""

import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Building, Expense, CommonExpensePeriod, ApartmentShare
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from buildings.models import Building as BuildingModel

def check_management_fees():
    """Check how management fees are handled across different months"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        
        print("🏢 Checking Management Fees Filtering")
        print("=" * 50)
        
        # Check building management fee settings
        try:
            building = BuildingModel.objects.get(id=building_id)
            print(f"Building: {building.name}")
            print(f"Management fee per apartment: {getattr(building, 'management_fee_per_apartment', 'Not set')}")
            print(f"Total apartments: {building.apartments.count()}")
        except Exception as e:
            print(f"Error getting building info: {e}")
        
        # Test different months
        test_months = ["2025-02", "2025-08", "2025-12"]
        
        for month in test_months:
            print(f"\n📅 Testing month: {month}")
            print("-" * 30)
            
            # Test with CommonExpenseCalculator
            try:
                calculator = CommonExpenseCalculator(building_id, month)
                shares = calculator.calculate_shares(include_reserve_fund=True)
                total_expenses = calculator.get_total_expenses()
                
                print(f"   Regular Calculator:")
                print(f"   - Total expenses: {total_expenses}€")
                print(f"   - Number of apartments: {len(shares)}")
                
                # Check if management fees are included
                if shares:
                    first_apt_id = list(shares.keys())[0]
                    first_share = shares[first_apt_id]
                    print(f"   - Sample apartment share: {first_share.get('total_amount', 0)}€")
                
            except Exception as e:
                print(f"   ❌ Regular Calculator Error: {e}")
            
            # Test with AdvancedCommonExpenseCalculator
            try:
                from datetime import datetime, date, timedelta
                year, month_num = month.split('-')
                year, month_num = int(year), int(month_num)
                
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = date(year, month_num + 1, 1) - timedelta(days=1)
                
                period_start = start_date.strftime('%Y-%m-%d')
                period_end = end_date.strftime('%Y-%m-%d')
                
                adv_calculator = AdvancedCommonExpenseCalculator(
                    building_id=building_id,
                    period_start_date=period_start,
                    period_end_date=period_end,
                    reserve_fund_monthly_total=Decimal('0.00')
                )
                
                result = adv_calculator.calculate_advanced_shares()
                
                print(f"   Advanced Calculator:")
                print(f"   - Management fee per apartment: {result.get('management_fee_per_apartment', 0)}€")
                print(f"   - Total apartments: {result.get('total_apartments', 0)}")
                print(f"   - General expenses total: {result.get('expense_totals', {}).get('general', 0)}€")
                
                # Check expense details
                expense_details = result.get('expense_details', {})
                if expense_details.get('general'):
                    management_expenses = [exp for exp in expense_details['general'] 
                                         if 'management' in exp.get('category', '').lower()]
                    print(f"   - Management expenses found: {len(management_expenses)}")
                    for exp in management_expenses:
                        print(f"     * {exp.get('category', 'Unknown')}: {exp.get('amount', 0)}€")
                
            except Exception as e:
                print(f"   ❌ Advanced Calculator Error: {e}")

def check_reserve_fund_settings():
    """Check reserve fund goal and duration settings"""
    
    with schema_context('demo'):
        building_id = 1
        
        print("\n🏦 Checking Reserve Fund Settings")
        print("=" * 50)
        
        try:
            building = BuildingModel.objects.get(id=building_id)
            
            # Check if building has reserve fund settings
            reserve_attrs = ['reserve_fund_goal', 'reserve_fund_duration', 'reserve_fund_start_date']
            
            print(f"Building: {building.name}")
            for attr in reserve_attrs:
                value = getattr(building, attr, 'Not found')
                print(f"{attr}: {value}")
            
            # Test reserve fund calculation with different months
            test_months = ["2025-02", "2025-08"]
            
            for month in test_months:
                print(f"\n📅 Reserve fund for {month}:")
                print("-" * 25)
                
                try:
                    from datetime import datetime, date, timedelta
                    year, month_num = month.split('-')
                    year, month_num = int(year), int(month_num)
                    
                    start_date = date(year, month_num, 1)
                    if month_num == 12:
                        end_date = date(year + 1, 1, 1) - timedelta(days=1)
                    else:
                        end_date = date(year, month_num + 1, 1) - timedelta(days=1)
                    
                    period_start = start_date.strftime('%Y-%m-%d')
                    period_end = end_date.strftime('%Y-%m-%d')
                    
                    # Test with different reserve fund amounts
                    for reserve_amount in [0, 50, 100]:
                        calculator = AdvancedCommonExpenseCalculator(
                            building_id=building_id,
                            period_start_date=period_start,
                            period_end_date=period_end,
                            reserve_fund_monthly_total=Decimal(str(reserve_amount))
                        )
                        
                        result = calculator.calculate_advanced_shares()
                        
                        print(f"   Reserve amount {reserve_amount}€:")
                        print(f"   - Goal: {result.get('reserve_fund_goal', 0)}€")
                        print(f"   - Duration: {result.get('reserve_fund_duration', 0)} months")
                        print(f"   - Contribution: {result.get('reserve_contribution', 0)}€")
                        print(f"   - Current reserve: {result.get('current_reserve', 0)}€")
                        print()
                
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    
        except Exception as e:
            print(f"❌ Error getting building: {e}")

def check_database_storage():
    """Check if financial data is properly stored in database"""
    
    with schema_context('demo'):
        building_id = 1
        
        print("\n💾 Checking Database Storage")
        print("=" * 50)
        
        # Check expenses by month
        print("📊 Expenses by month:")
        expenses_by_month = {}
        
        expenses = Expense.objects.filter(building_id=building_id).order_by('date')
        
        for expense in expenses:
            month_key = expense.date.strftime('%Y-%m')
            if month_key not in expenses_by_month:
                expenses_by_month[month_key] = []
            expenses_by_month[month_key].append(expense)
        
        for month, month_expenses in expenses_by_month.items():
            total_amount = sum(exp.amount for exp in month_expenses)
            print(f"   {month}: {len(month_expenses)} expenses, total: {total_amount}€")
            for exp in month_expenses:
                print(f"     - {exp.category}: {exp.amount}€")
        
        # Check common expense periods
        print(f"\n📋 Common Expense Periods:")
        periods = CommonExpensePeriod.objects.filter(building_id=building_id).order_by('-start_date')
        
        for period in periods[:5]:  # Show last 5 periods
            print(f"   {period.period_name}: {period.start_date} to {period.end_date}")
            
            # Check apartment shares for this period
            shares = ApartmentShare.objects.filter(period=period)
            if shares.exists():
                total_shares = sum(share.total_amount for share in shares)
                print(f"     - {shares.count()} apartment shares, total: {total_shares}€")
        
        # Check if there are any management fee expenses
        print(f"\n🏢 Management Fee Expenses:")
        mgmt_expenses = Expense.objects.filter(
            building_id=building_id,
            category='management_fees'
        )
        
        if mgmt_expenses.exists():
            for exp in mgmt_expenses:
                print(f"   {exp.date}: {exp.amount}€")
        else:
            print("   No management fee expenses found in database")
            print("   (Management fees might be calculated automatically)")

def main():
    """Run all verification checks"""
    print("🔍 Verifying Management Fees and Reserve Fund Filtering")
    print("=" * 60)
    
    check_management_fees()
    check_reserve_fund_settings()
    check_database_storage()
    
    print("\n" + "=" * 60)
    print("✅ Verification completed!")
    print("\nKey findings will help identify:")
    print("- Whether management fees are properly filtered by month")
    print("- How reserve fund calculations work across months")
    print("- What data is stored vs calculated dynamically")

if __name__ == "__main__":
    main()
