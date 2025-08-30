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

def debug_modal_expense_data():
    """Debug the expense data that goes to CommonExpenseModal"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        
        print("🔍 MODAL EXPENSE DATA DEBUG")
        print("=" * 50)
        
        # Test with July 2025 (2025-07)
        print("\n📋 TESTING JULY 2025 DATA:")
        
        try:
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date='2025-07-01',
                period_end_date='2025-07-31'
            )
            
            result = calculator.calculate_advanced_shares()
            
            print(f"Result keys: {list(result.keys())}")
            
            if 'expense_details' in result:
                expense_details = result['expense_details']
                print(f"\nExpense details keys: {list(expense_details.keys())}")
                
                for category, expenses in expense_details.items():
                    if expenses:
                        print(f"\n{category.upper()} ({len(expenses)} items):")
                        total = 0
                        for expense in expenses:
                            print(f"   Amount: €{expense.get('amount', 0):,.2f} | Category: {expense.get('category', 'unknown')}")
                            total += expense.get('amount', 0)
                        print(f"   TOTAL {category}: €{total:,.2f}")
                    else:
                        print(f"\n{category.upper()}: No expenses")
            
            if 'expense_totals' in result:
                expense_totals = result['expense_totals']
                print(f"\nExpense totals: {expense_totals}")
                
                total_all_expenses = sum(expense_totals.values()) if expense_totals else 0
                print(f"Total all expenses: €{total_all_expenses:,.2f}")
            
            # Check management fees
            management_fee = result.get('management_fee_per_apartment', 0)
            total_apartments = result.get('total_apartments', 0)
            total_management = management_fee * total_apartments
            
            print(f"\nManagement fees:")
            print(f"   Per apartment: €{management_fee:,.2f}")
            print(f"   Total apartments: {total_apartments}")
            print(f"   Total management: €{total_management:,.2f}")
            
            # Check if there's a date filter issue
            print(f"\nCalculation date: {result.get('calculation_date', 'not set')}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_modal_expense_data()
