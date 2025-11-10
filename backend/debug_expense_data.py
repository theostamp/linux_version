#!/usr/bin/env python3
"""
Debug script to check what expenses exist in the database and why they're not being included
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Building
from apartments.models import Apartment

def debug_expense_data():
    """Debug expense data and calculator logic"""
    
    with schema_context('demo'):
        print("🔍 Debugging expense data and calculator logic...")
        
        # Check building and apartments
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Building: {building.name} (ID: {building.id})")
            
            apartments = Apartment.objects.filter(building_id=1)
            print(f"🏠 Apartments count: {apartments.count()}")
            
            # Check management fee setting
            print(f"💰 Management fee per apartment: {building.management_fee_per_apartment}€")
            expected_management_total = building.management_fee_per_apartment * apartments.count()
            print(f"💰 Expected total management fees: {expected_management_total}€")
            
        except Exception as e:
            print(f"❌ Error getting building data: {e}")
            return
        
        # Check all expenses
        print("\n📊 All expenses in database:")
        expenses = Expense.objects.filter(building_id=1).order_by('date')
        
        if not expenses.exists():
            print("❌ No expenses found in database!")
            return
            
        for expense in expenses:
            print(f"   📅 {expense.date} | {expense.category} | {expense.amount}€ | {expense.title}")
        
        # Check expenses by month
        print("\n📅 Expenses by month:")
        
        # June 2025
        june_expenses = expenses.filter(date__year=2025, date__month=6)
        print(f"   June 2025: {june_expenses.count()} expenses")
        for exp in june_expenses:
            print(f"      - {exp.date}: {exp.amount}€ ({exp.title})")
        
        # August 2025  
        august_expenses = expenses.filter(date__year=2025, date__month=8)
        print(f"   August 2025: {august_expenses.count()} expenses")
        for exp in august_expenses:
            print(f"      - {exp.date}: {exp.amount}€ ({exp.title})")
        
        # Test AdvancedCommonExpenseCalculator directly
        print("\n🧮 Testing AdvancedCommonExpenseCalculator directly...")
        
        from financial.services import AdvancedCommonExpenseCalculator
        
        # Test with August 2025 (should include the 300€ ΔΕΗ)
        print("\n📅 Testing August 2025 calculation:")
        calculator = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=100
        )
        
        # Check what expenses the calculator finds
        print(f"🔍 Calculator expenses found: {len(calculator.expenses)}")
        for expense in calculator.expenses:
            print(f"   - {expense.date}: {expense.amount}€ ({expense.title})")
        
        # Check management fees calculation
        total_management = calculator.building.management_fee_per_apartment * calculator.apartments.count()
        print(f"🏢 Calculator management fees: {total_management}€")
        
        # Run the calculation
        try:
            result = calculator.calculate_advanced_shares()
            print("✅ Calculation result:")
            print(f"   Total amount: {result.get('total_amount', 0)}€")
            print(f"   Management fees: {result.get('management_fees', 0)}€")
            print(f"   Reserve fund: {result.get('reserve_fund_contribution', 0)}€")
            
            # Check if breakdown exists
            if 'breakdown' in result:
                print(f"   Breakdown apartments: {len(result['breakdown'])}")
            
        except Exception as e:
            print(f"❌ Calculation failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_expense_data()
