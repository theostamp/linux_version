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

def debug_zero_obligations_difference():
    """Debug the remaining difference when there are zero obligations"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔍 DEBUGGING ZERO OBLIGATIONS DIFFERENCE")
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
        
        print(f"   Basic Calculator Total: €{basic_total:,.2f}")
        print(f"   Basic Calculator Reserve: €{basic_reserve:,.2f}")
        print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
        print(f"   Difference: €{advanced_total - basic_total:,.2f}")
        
        # 3. Detailed breakdown comparison
        print("\n3. DETAILED BREAKDOWN COMPARISON:")
        print("-" * 100)
        print(f"{'Apt':<4} {'Basic Total':<12} {'Basic Reserve':<14} {'Advanced Total':<15} {'Advanced Reserve':<16} {'Diff':<10}")
        print("-" * 100)
        
        for apt in apartments.order_by('number'):
            basic_share = basic_shares.get(apt.id, {})
            advanced_share = advanced_shares['shares'].get(apt.id, {})
            
            basic_total_apt = basic_share.get('total_amount', 0)
            basic_reserve_apt = basic_share.get('reserve_fund_amount', 0)
            advanced_total_apt = advanced_share.get('total_amount', 0)
            advanced_reserve_apt = advanced_share.get('breakdown', {}).get('reserve_fund_contribution', 0)
            
            diff = advanced_total_apt - basic_total_apt
            
            print(f"{apt.number:<4} €{basic_total_apt:<11,.2f} €{basic_reserve_apt:<13,.2f} €{advanced_total_apt:<14,.2f} €{advanced_reserve_apt:<15,.2f} €{diff:<9,.2f}")
        
        print("-" * 100)
        
        # 4. Check expense breakdowns
        print("\n4. EXPENSE BREAKDOWN COMPARISON:")
        
        # Get first apartment for detailed comparison
        first_apt_id = list(basic_shares.keys())[0]
        first_apt_basic = basic_shares[first_apt_id]
        first_apt_advanced = advanced_shares['shares'][first_apt_id]
        
        print(f"   First Apartment ({first_apt_basic['apartment_number']}) - Basic Calculator:")
        for item in first_apt_basic['breakdown']:
            print(f"     - {item['expense_title']}: €{item['apartment_share']:,.2f}")
        
        print(f"   First Apartment ({first_apt_advanced['apartment_number']}) - Advanced Calculator:")
        for key, value in first_apt_advanced['breakdown'].items():
            print(f"     - {key}: €{value:,.2f}")
        
        # 5. Check expense totals
        print("\n5. EXPENSE TOTALS COMPARISON:")
        expense_totals = advanced_shares['expense_totals']
        print("   Advanced Calculator Expense Totals:")
        for key, value in expense_totals.items():
            print(f"     - {key}: €{value:,.2f}")
        
        # 6. Check reserve fund calculation
        print("\n6. RESERVE FUND CALCULATION:")
        reserve_contribution = advanced_shares.get('reserve_contribution', 0)
        print(f"   Advanced Calculator Reserve Contribution: €{reserve_contribution:,.2f}")
        print(f"   Basic Calculator Reserve Total: €{basic_reserve:,.2f}")
        
        # 7. Check if reserve fund is being added correctly
        print("\n7. RESERVE FUND ADDITION CHECK:")
        basic_without_reserve = basic_total - basic_reserve
        advanced_without_reserve = advanced_total - sum(share['breakdown']['reserve_fund_contribution'] for share in advanced_shares['shares'].values())
        
        print(f"   Basic Total without Reserve: €{basic_without_reserve:,.2f}")
        print(f"   Advanced Total without Reserve: €{advanced_without_reserve:,.2f}")
        print(f"   Difference without Reserve: €{advanced_without_reserve - basic_without_reserve:,.2f}")
        
        # 8. Check management fee
        print("\n8. MANAGEMENT FEE CHECK:")
        management_fee_per_apt = building.management_fee_per_apartment or 0
        total_management_fee = management_fee_per_apt * len(apartments)
        print(f"   Management Fee per Apartment: €{management_fee_per_apt:,.2f}")
        print(f"   Total Management Fee: €{total_management_fee:,.2f}")
        
        # Check if both calculators include management fee
        basic_without_management = basic_without_reserve - total_management_fee
        advanced_without_management = advanced_without_reserve - total_management_fee
        
        print(f"   Basic without Management: €{basic_without_management:,.2f}")
        print(f"   Advanced without Management: €{advanced_without_management:,.2f}")
        print(f"   Difference without Management: €{advanced_without_management - basic_without_management:,.2f}")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    debug_zero_obligations_difference()
