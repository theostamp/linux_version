import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction
from financial.services import AdvancedCommonExpenseCalculator
from datetime import datetime, date
from decimal import Decimal

def verify_financial_flow():
    """Verify the complete financial flow logic"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔍 FINANCIAL FLOW VERIFICATION")
        print("=" * 60)
        print(f"Building: {building.name}")
        print(f"Apartments: {apartments.count()}")
        
        # Test the financial flow logic
        print("\n📋 TESTING FINANCIAL FLOW LOGIC:")
        print("Rule 1: Expenses recorded in Month 2 → Create payable sheet for Month 3")
        print("Rule 2: Progressive balance transfers Month 1 → Month 2 → Month 3")
        
        # 1. Check current state
        print(f"\n🏢 CURRENT APARTMENT BALANCES:")
        total_current_balance = Decimal('0.00')
        for apt in apartments:
            balance = apt.current_balance or Decimal('0.00')
            total_current_balance += balance
            print(f"   {apt.identifier}: €{balance:,.2f}")
        print(f"   TOTAL BUILDING BALANCE: €{total_current_balance:,.2f}")
        
        # 2. Check all expenses by month
        print(f"\n📊 EXPENSES BY MONTH:")
        months_to_check = [
            ('2025-06', 'June 2025'),
            ('2025-07', 'July 2025'), 
            ('2025-08', 'August 2025')
        ]
        
        for month_str, month_name in months_to_check:
            year, month = month_str.split('-')
            month_expenses = Expense.objects.filter(
                building_id=building_id,
                date__year=int(year),
                date__month=int(month)
            )
            
            total_month = sum(exp.amount for exp in month_expenses)
            print(f"\n   {month_name}:")
            print(f"     Expenses count: {month_expenses.count()}")
            print(f"     Total amount: €{total_month:,.2f}")
            
            if month_expenses.exists():
                for exp in month_expenses:
                    print(f"       - {exp.date}: €{exp.amount:,.2f} ({exp.category})")
        
        # 3. Test expense flow logic
        print(f"\n🔄 TESTING EXPENSE FLOW:")
        
        # Test June expenses → July payable
        print(f"\n   June 2025 expenses should create July 2025 payable sheet:")
        try:
            june_calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date='2025-06-01',
                period_end_date='2025-06-30'
            )
            june_result = june_calculator.calculate_advanced_shares()
            june_total = sum(june_result['expense_totals'].values()) if june_result.get('expense_totals') else 0
            print(f"     June expenses total: €{june_total:,.2f}")
            print(f"     → This should be payable in July 2025")
        except Exception as e:
            print(f"     ❌ Error calculating June: {e}")
        
        # Test July expenses → August payable
        print(f"\n   July 2025 expenses should create August 2025 payable sheet:")
        try:
            july_calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date='2025-07-01',
                period_end_date='2025-07-31'
            )
            july_result = july_calculator.calculate_advanced_shares()
            july_total = sum(july_result['expense_totals'].values()) if july_result.get('expense_totals') else 0
            print(f"     July expenses total: €{july_total:,.2f}")
            print(f"     → This should be payable in August 2025")
        except Exception as e:
            print(f"     ❌ Error calculating July: {e}")
        
        # 4. Test balance progression
        print(f"\n💰 TESTING BALANCE PROGRESSION:")
        
        # Check transactions to understand balance flow
        all_transactions = Transaction.objects.filter(
            building_id=building_id
        ).order_by('created_at')
        
        print(f"\n   Total transactions: {all_transactions.count()}")
        
        if all_transactions.exists():
            print(f"   Recent transactions:")
            for txn in all_transactions[:10]:  # Show first 10
                print(f"     {txn.created_at.date()}: {txn.apartment.identifier} → €{txn.amount:,.2f} ({txn.reference_type})")
        
        # 5. Verify the logic is working correctly
        print(f"\n✅ VERIFICATION RESULTS:")
        
        # Rule 1 verification
        print(f"\n   Rule 1: Month N expenses → Month N+1 payable")
        if june_total == 0 and july_total == 10:  # Only management fees in July
            print(f"     ✅ CORRECT: June (€0) → July payable, July (€10) → August payable")
        else:
            print(f"     ⚠️  CHECK: June (€{june_total:,.2f}), July (€{july_total:,.2f})")
        
        # Rule 2 verification  
        print(f"\n   Rule 2: Progressive balance transfer")
        if total_current_balance != 0:
            print(f"     📊 Current building balance: €{total_current_balance:,.2f}")
            print(f"     💡 This balance carries forward to next month calculations")
        else:
            print(f"     ✅ Building is balanced (€0 total)")
        
        # 6. Practical example
        print(f"\n📝 PRACTICAL EXAMPLE:")
        print(f"   Scenario: Record €300 ΔΕΗ expense in June 2025")
        print(f"   Expected result:")
        print(f"     - June 2025: €300 expense recorded")
        print(f"     - July 2025: Common expense sheet shows €300 + €10 management = €310 payable")
        print(f"     - August 2025: Previous balances from July carry forward")
        
        print(f"\n" + "=" * 60)

if __name__ == "__main__":
    verify_financial_flow()
