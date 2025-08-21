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
from financial.models import Expense
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from decimal import Decimal

def debug_calculation_differences():
    """Debug what's causing the differences between calculators"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔍 DEBUGGING CALCULATION DIFFERENCES")
        print("=" * 50)
        
        # 1. Test Basic Calculator
        print("\n1. BASIC CALCULATOR DETAILS:")
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=True)
        
        print(f"   Total Expenses: €{basic_calculator.get_total_expenses():,.2f}")
        print(f"   Apartments Count: {basic_calculator.get_apartments_count()}")
        
        # Show breakdown for first apartment
        first_apt_id = list(basic_shares.keys())[0]
        first_apt_share = basic_shares[first_apt_id]
        print(f"   First Apartment ({first_apt_share['apartment_number']}) Breakdown:")
        for item in first_apt_share['breakdown']:
            print(f"     - {item['expense_title']}: €{item['apartment_share']:,.2f}")
        
        # 2. Test Advanced Calculator
        print("\n2. ADVANCED CALCULATOR DETAILS:")
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        advanced_shares = advanced_calculator.calculate_advanced_shares()
        
        print(f"   Reserve Fund Monthly Total: €{advanced_calculator.reserve_fund_monthly_total:,.2f}")
        print(f"   Heating Type: {advanced_calculator.heating_type}")
        print(f"   Heating Fixed Percentage: {advanced_calculator.heating_fixed_percentage}")
        
        # Show breakdown for first apartment
        first_apt_advanced = advanced_shares['shares'][first_apt_id]
        print(f"   First Apartment ({first_apt_advanced['apartment_number']}) Breakdown:")
        for key, value in first_apt_advanced['breakdown'].items():
            print(f"     - {key}: €{value:,.2f}")
        
        # 3. Compare totals
        print("\n3. TOTAL COMPARISON:")
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
        
        print(f"   Basic Total: €{basic_total:,.2f}")
        print(f"   Advanced Total: €{advanced_total:,.2f}")
        print(f"   Difference: €{advanced_total - basic_total:,.2f}")
        
        # 4. Compare by expense type
        print("\n4. EXPENSE TYPE COMPARISON:")
        
        # Get expense totals from advanced calculator
        expense_totals = advanced_shares['expense_totals']
        print(f"   Advanced Calculator Expense Totals:")
        for key, value in expense_totals.items():
            print(f"     - {key}: €{value:,.2f}")
        
        # 5. Check if management fee is included
        print("\n5. MANAGEMENT FEE CHECK:")
        management_fee_per_apt = building.management_fee_per_apartment or 0
        total_management_fee = management_fee_per_apt * len(apartments)
        print(f"   Management Fee per Apartment: €{management_fee_per_apt:,.2f}")
        print(f"   Total Management Fee: €{total_management_fee:,.2f}")
        
        # Check if basic calculator includes management fee
        basic_without_management = basic_total - total_management_fee
        print(f"   Basic Total without Management: €{basic_without_management:,.2f}")
        print(f"   Advanced Total without Management: €{advanced_total - total_management_fee:,.2f}")
        
        # 6. Check reserve fund calculation
        print("\n6. RESERVE FUND CHECK:")
        basic_reserve = sum(share['reserve_fund_amount'] for share in basic_shares.values())
        advanced_reserve = sum(share['breakdown']['reserve_fund_contribution'] for share in advanced_shares['shares'].values())
        
        print(f"   Basic Reserve Fund: €{basic_reserve:,.2f}")
        print(f"   Advanced Reserve Fund: €{advanced_reserve:,.2f}")
        print(f"   Reserve Fund Difference: €{advanced_reserve - basic_reserve:,.2f}")
        
        # 7. Check obligations
        print("\n7. OBLIGATIONS CHECK:")
        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        
        # Check if obligations are preventing reserve fund
        if total_obligations > 0:
            print("   ✅ Obligations are preventing reserve fund collection (correct)")
        else:
            print("   ❌ No obligations, reserve fund should be collected")
        
        # 8. Detailed apartment comparison
        print("\n8. DETAILED APARTMENT COMPARISON:")
        print("-" * 100)
        print(f"{'Apt':<4} {'Basic':<10} {'Basic Reserve':<12} {'Advanced':<10} {'Advanced Reserve':<15} {'Diff':<10}")
        print("-" * 100)
        
        for apt in apartments.order_by('number'):
            basic_share = basic_shares.get(apt.id, {})
            advanced_share = advanced_shares['shares'].get(apt.id, {})
            
            basic_total_apt = basic_share.get('total_amount', 0)
            basic_reserve_apt = basic_share.get('reserve_fund_amount', 0)
            advanced_total_apt = advanced_share.get('total_amount', 0)
            advanced_reserve_apt = advanced_share.get('breakdown', {}).get('reserve_fund_contribution', 0)
            
            diff = advanced_total_apt - basic_total_apt
            
            print(f"{apt.number:<4} €{basic_total_apt:<9,.2f} €{basic_reserve_apt:<11,.2f} €{advanced_total_apt:<9,.2f} €{advanced_reserve_apt:<14,.2f} €{diff:<9,.2f}")
        
        print("-" * 100)
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    debug_calculation_differences()

