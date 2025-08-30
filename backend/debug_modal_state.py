import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator
from datetime import datetime

def debug_modal_state():
    """Debug what data is actually being sent to the modal"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        
        print("🔍 MODAL STATE DEBUG")
        print("=" * 50)
        
        # Test what happens when we request July 2025 data
        print("\n📋 TESTING JULY 2025 REQUEST:")
        
        try:
            # This is what the frontend should be calling for July
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date='2025-07-01',
                period_end_date='2025-07-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            print(f"✅ Calculator created successfully")
            print(f"📊 Result keys: {list(result.keys())}")
            
            # Check expense details
            if 'expense_details' in result:
                expense_details = result['expense_details']
                print(f"\n📋 Expense Details:")
                for category, expenses in expense_details.items():
                    if expenses:
                        total = sum(exp.get('amount', 0) for exp in expenses)
                        print(f"   {category}: {len(expenses)} items, Total: €{total:,.2f}")
                    else:
                        print(f"   {category}: No expenses")
            
            # Check expense totals
            if 'expense_totals' in result:
                expense_totals = result['expense_totals']
                print(f"\n💰 Expense Totals:")
                for category, amount in expense_totals.items():
                    print(f"   {category}: €{amount:,.2f}")
                
                total_expenses = sum(expense_totals.values())
                print(f"   TOTAL: €{total_expenses:,.2f}")
            
            # Check reserve fund info
            reserve_goal = result.get('reserve_fund_goal', 0)
            reserve_duration = result.get('reserve_fund_duration', 0)
            reserve_contribution = result.get('reserve_contribution', 0)
            
            print(f"\n🏦 Reserve Fund Info:")
            print(f"   Goal: €{reserve_goal:,.2f}")
            print(f"   Duration: {reserve_duration} months")
            print(f"   Monthly contribution: €{reserve_contribution:,.2f}")
            
            # Check management fee
            mgmt_fee = result.get('management_fee_per_apartment', 0)
            total_apartments = result.get('total_apartments', 0)
            
            print(f"\n💼 Management Info:")
            print(f"   Fee per apartment: €{mgmt_fee:,.2f}")
            print(f"   Total apartments: {total_apartments}")
            print(f"   Total management: €{mgmt_fee * total_apartments:,.2f}")
            
            # What should the modal show?
            print(f"\n🎯 EXPECTED MODAL DISPLAY:")
            print(f"   Period: Ιούλιος 2025")
            print(f"   Total expenses: €{total_expenses:,.2f}")
            print(f"   Reserve fund: {'Hidden (0€)' if reserve_goal == 0 else f'€{reserve_contribution:,.2f}'}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_modal_state()
