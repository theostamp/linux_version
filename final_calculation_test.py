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
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator

def final_calculation_test():
    """Final test to understand calculation differences"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🎯 FINAL CALCULATION TEST")
        print("=" * 50)
        
        # Set all balances to zero
        print("\n1. SETTING ZERO OBLIGATIONS:")
        for apt in apartments:
            apt.current_balance = 0
            apt.save()
        
        print("   ✅ All apartment balances set to zero")
        
        # 2. Test both calculators
        print("\n2. CALCULATOR COMPARISON:")
        
        # Basic Calculator
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=True)
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        basic_reserve = sum(share['reserve_fund_amount'] for share in basic_shares.values())
        
        # Advanced Calculator
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        advanced_shares = advanced_calculator.calculate_advanced_shares()
        advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
        advanced_reserve = sum(share['breakdown']['reserve_fund_contribution'] for share in advanced_shares['shares'].values())
        
        print(f"   Basic Calculator Total: €{basic_total:,.2f}")
        print(f"   Basic Calculator Reserve: €{basic_reserve:,.2f}")
        print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
        print(f"   Advanced Calculator Reserve: €{advanced_reserve:,.2f}")
        print(f"   Difference: €{advanced_total - basic_total:,.2f}")
        
        # 3. Check if reserve fund is included in total_amount
        print("\n3. RESERVE FUND IN TOTAL_AMOUNT CHECK:")
        
        # Check Basic Calculator
        basic_without_reserve = basic_total - basic_reserve
        print(f"   Basic Total without Reserve: €{basic_without_reserve:,.2f}")
        print(f"   Basic Reserve Amount: €{basic_reserve:,.2f}")
        print(f"   Basic Total with Reserve: €{basic_total:,.2f}")
        
        # Check Advanced Calculator
        advanced_without_reserve = advanced_total - advanced_reserve
        print(f"   Advanced Total without Reserve: €{advanced_without_reserve:,.2f}")
        print(f"   Advanced Reserve Amount: €{advanced_reserve:,.2f}")
        print(f"   Advanced Total with Reserve: €{advanced_total:,.2f}")
        
        # 4. Check expense breakdowns
        print("\n4. EXPENSE BREAKDOWN COMPARISON:")
        
        # Get first apartment for detailed comparison
        first_apt_id = list(basic_shares.keys())[0]
        first_apt_basic = basic_shares[first_apt_id]
        first_apt_advanced = advanced_shares['shares'][first_apt_id]
        
        print(f"   First Apartment ({first_apt_basic['apartment_number']}) - Basic Calculator:")
        basic_expenses = 0
        for item in first_apt_basic['breakdown']:
            if 'Εισφορά Αποθεματικού' not in item['expense_title']:
                basic_expenses += item['apartment_share']
            print(f"     - {item['expense_title']}: €{item['apartment_share']:,.2f}")
        
        print(f"   First Apartment ({first_apt_advanced['apartment_number']}) - Advanced Calculator:")
        advanced_expenses = 0
        for key, value in first_apt_advanced['breakdown'].items():
            if key != 'reserve_fund_contribution':
                advanced_expenses += value
            print(f"     - {key}: €{value:,.2f}")
        
        print(f"   Basic Expenses (without reserve): €{basic_expenses:,.2f}")
        print(f"   Advanced Expenses (without reserve): €{advanced_expenses:,.2f}")
        print(f"   Expense Difference: €{advanced_expenses - basic_expenses:,.2f}")
        
        # 5. Check management fee
        print("\n5. MANAGEMENT FEE CHECK:")
        management_fee_per_apt = building.management_fee_per_apartment or 0
        print(f"   Management Fee per Apartment: €{management_fee_per_apt:,.2f}")
        
        # Check if both include management fee
        basic_without_management = basic_expenses - management_fee_per_apt
        advanced_without_management = advanced_expenses - management_fee_per_apt
        
        print(f"   Basic without Management: €{basic_without_management:,.2f}")
        print(f"   Advanced without Management: €{advanced_without_management:,.2f}")
        print(f"   Difference without Management: €{advanced_without_management - basic_without_management:,.2f}")
        
        # 6. Check expense totals
        print("\n6. EXPENSE TOTALS COMPARISON:")
        expense_totals = advanced_shares['expense_totals']
        print("   Advanced Calculator Expense Totals:")
        for key, value in expense_totals.items():
            print(f"     - {key}: €{value:,.2f}")
        
        # 7. Check if Advanced Calculator includes reserve fund in total_amount
        print("\n7. ADVANCED CALCULATOR RESERVE FUND CHECK:")
        print(f"   Advanced Calculator Reserve Contribution: €{advanced_shares.get('reserve_contribution', 0):,.2f}")
        print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
        print(f"   Advanced Calculator Reserve in Breakdown: €{advanced_reserve:,.2f}")
        
        # Check if reserve fund is added to total_amount
        if abs(advanced_total - (advanced_without_reserve + advanced_reserve)) < 0.01:
            print("   ✅ Advanced Calculator includes reserve fund in total_amount")
        else:
            print("   ❌ Advanced Calculator does NOT include reserve fund in total_amount")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    final_calculation_test()


