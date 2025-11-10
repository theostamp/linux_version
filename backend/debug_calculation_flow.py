#!/usr/bin/env python3
"""
Debug script to trace the exact calculation flow in AdvancedCommonExpenseCalculator
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

def debug_calculation_flow():
    """Debug the exact calculation flow step by step"""
    
    with schema_context('demo'):
        print("🔍 Debugging AdvancedCommonExpenseCalculator calculation flow...")
        
        # Create calculator for August 2025 (should include 300€ ΔΕΗ)
        calculator = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=100
        )
        
        print(f"🏢 Building: {calculator.building.name}")
        print(f"🏠 Apartments: {len(calculator.apartments)}")
        print(f"📊 Expenses found: {len(calculator.expenses)}")
        
        for expense in calculator.expenses:
            print(f"   - {expense.date}: {expense.amount}€ ({expense.title}) - Category: {expense.category}")
        
        # Step 1: Test _calculate_expense_totals
        print("\n🧮 Step 1: _calculate_expense_totals()")
        expense_totals = calculator._calculate_expense_totals()
        print(f"   General: {expense_totals['general']}€")
        print(f"   Elevator: {expense_totals['elevator']}€") 
        print(f"   Heating: {expense_totals['heating']}€")
        print(f"   Equal Share: {expense_totals['equal_share']}€")
        print(f"   Individual: {expense_totals['individual']}€")
        
        total_expense_amount = sum(expense_totals.values())
        print(f"   📊 Total from expense_totals: {total_expense_amount}€")
        
        # Step 2: Test _initialize_shares
        print("\n🧮 Step 2: _initialize_shares()")
        shares = calculator._initialize_shares()
        print(f"   Initialized {len(shares)} apartment shares")
        
        # Step 3: Test heating costs
        print("\n🧮 Step 3: _calculate_heating_costs()")
        heating_costs = calculator._calculate_heating_costs(expense_totals['heating'])
        print(f"   Total heating cost: {heating_costs['total_cost']}€")
        
        # Step 4: Test the main distribution methods
        print("\n🧮 Step 4: Testing distribution methods")
        
        # Test general expenses distribution
        if expense_totals['general'] > 0:
            print(f"   📊 Distributing general expenses: {expense_totals['general']}€")
            calculator._distribute_general_expenses(shares, expense_totals['general'])
            
            # Check first apartment's share
            first_apt_id = str(calculator.apartments[0].id)
            if first_apt_id in shares:
                print(f"   Apartment {first_apt_id} general share: {shares[first_apt_id]['general_expenses']}€")
        
        # Step 5: Test reserve fund calculation
        print("\n🧮 Step 5: _calculate_reserve_fund_contributions()")
        calculator._calculate_reserve_fund_contributions(shares)
        
        first_apt_id = str(calculator.apartments[0].id)
        if first_apt_id in shares:
            print(f"   Apartment {first_apt_id} reserve fund: {shares[first_apt_id]['reserve_fund_contribution']}€")
        
        # Step 6: Test management fees
        print("\n🧮 Step 6: _calculate_management_fees()")
        calculator._calculate_management_fees(shares)
        
        if first_apt_id in shares:
            print(f"   Apartment {first_apt_id} management fee: {shares[first_apt_id]['management_fees']}€")
        
        # Step 7: Test final totals calculation
        print("\n🧮 Step 7: _calculate_final_totals()")
        calculator._calculate_final_totals(shares)
        
        if first_apt_id in shares:
            print(f"   Apartment {first_apt_id} total amount: {shares[first_apt_id]['total_amount']}€")
        
        # Step 8: Run full calculation and compare
        print("\n🧮 Step 8: Full calculate_advanced_shares()")
        try:
            result = calculator.calculate_advanced_shares()
            print("✅ Full calculation result:")
            print(f"   Total amount: {result.get('total_amount', 0)}€")
            print(f"   Management fees: {result.get('management_fees', 0)}€")
            print(f"   Reserve fund: {result.get('reserve_fund_contribution', 0)}€")
            
            # Check breakdown
            if 'breakdown' in result and result['breakdown']:
                first_apt_breakdown = list(result['breakdown'].values())[0]
                print("   First apartment breakdown:")
                print(f"     Total share: {first_apt_breakdown.get('total_share', 0)}€")
                print(f"     General expenses: {first_apt_breakdown.get('general_expenses', 0)}€")
                print(f"     Management fees: {first_apt_breakdown.get('management_fees', 0)}€")
                print(f"     Reserve fund: {first_apt_breakdown.get('reserve_fund_contribution', 0)}€")
            
        except Exception as e:
            print(f"❌ Full calculation failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_calculation_flow()
