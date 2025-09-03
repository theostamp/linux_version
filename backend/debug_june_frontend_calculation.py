import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import datetime

with schema_context('demo'):
    from financial.services import AdvancedCommonExpenseCalculator
    from buildings.models import Building
    
    print("=== JUNE 2025 FRONTEND CALCULATION DEBUG ===")
    print(f"Investigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    building_id = 1  # Αλκμάνος 22
    building = Building.objects.get(id=building_id)
    
    print(f"Building: {building.name}")
    print(f"Management Fee per apartment: {building.management_fee_per_apartment}€")
    print()
    
    # Test June 2025 calculation - this is what the frontend is doing
    print("=== TESTING JUNE 2025 CALCULATION (Frontend Logic) ===")
    
    try:
        # This is likely what the frontend is calling for June 2025
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-06-01',
            period_end_date='2025-06-30'
        )
        
        print(f"Calculator period: {calculator.period_start_date} to {calculator.period_end_date}")
        print(f"Number of expenses found: {len(calculator.expenses)}")
        
        # Show what expenses are being included
        for expense in calculator.expenses:
            print(f"  - {expense.title}: {expense.amount}€ (Date: {expense.date})")
        
        # Calculate shares
        result = calculator.calculate_advanced_shares()
        
        print("\nCalculation results:")
        print(f"Total expenses: {result.get('total_expenses', 0)}€")
        print(f"Reserve fund monthly total: {result.get('reserve_fund_monthly_total', 0)}€")
        
        # Check first apartment's calculation
        shares = result.get('shares', {})
        if shares:
            first_apt_key = list(shares.keys())[0]
            first_apt = shares[first_apt_key]
            print(f"\nFirst apartment ({first_apt_key}):")
            print(f"  Total amount: {first_apt.get('total_amount', 0)}€")
            print(f"  Previous balance: {first_apt.get('previous_balance', 0)}€")
            print(f"  Breakdown: {first_apt.get('breakdown', {})}")
            
            # Calculate total for all apartments
            total_all_apartments = sum(apt.get('total_amount', 0) for apt in shares.values())
            print(f"\nTotal across all apartments: {total_all_apartments}€")
        
    except Exception as e:
        print(f"Error in June 2025 calculation: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*50)
    
    # Test what happens if we don't specify period dates (might include all expenses)
    print("=== TESTING WITHOUT PERIOD DATES (All Expenses) ===")
    
    try:
        calculator_all = AdvancedCommonExpenseCalculator(building_id=building_id)
        
        print(f"Number of expenses found (all): {len(calculator_all.expenses)}")
        
        # Show what expenses are being included
        for expense in calculator_all.expenses:
            print(f"  - {expense.title}: {expense.amount}€ (Date: {expense.date})")
        
        result_all = calculator_all.calculate_advanced_shares()
        
        print("\nCalculation results (all expenses):")
        print(f"Total expenses: {result_all.get('total_expenses', 0)}€")
        
        # Check first apartment's calculation
        shares_all = result_all.get('shares', {})
        if shares_all:
            first_apt_key = list(shares_all.keys())[0]
            first_apt = shares_all[first_apt_key]
            print(f"\nFirst apartment ({first_apt_key}):")
            print(f"  Total amount: {first_apt.get('total_amount', 0)}€")
            
            # Calculate total for all apartments
            total_all_apartments = sum(apt.get('total_amount', 0) for apt in shares_all.values())
            print(f"\nTotal across all apartments: {total_all_apartments}€")
            
            # This might be where 343€ is coming from!
            if total_all_apartments == 343:
                print("\n🎯 FOUND THE SOURCE OF 343€!")
                print("The frontend is likely calling the calculator without proper period filtering")
        
    except Exception as e:
        print(f"Error in all expenses calculation: {e}")
        import traceback
        traceback.print_exc()
