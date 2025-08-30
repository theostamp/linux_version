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

def debug_reserve_fund_issue():
    """Debug the reserve fund calculation issue"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔍 RESERVE FUND DEBUG ANALYSIS")
        print("=" * 50)
        
        # 1. Building Configuration
        print("\n1. BUILDING CONFIGURATION:")
        print(f"   Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
        print(f"   Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
        print(f"   Reserve Fund Start Date: {building.reserve_fund_start_date}")
        print(f"   Reserve Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")
        
        # 2. Check why reserve fund is not calculated
        print("\n2. RESERVE FUND CALCULATION CHECKS:")
        
        # Check 1: Reserve fund goal
        if not building.reserve_fund_goal or building.reserve_fund_goal <= 0:
            print("   ❌ FAILED: Reserve fund goal is not set or is zero")
        else:
            print("   ✅ PASSED: Reserve fund goal is set")
        
        # Check 2: Reserve fund start date
        if not building.reserve_fund_start_date:
            print("   ❌ FAILED: Reserve fund start date is not set")
        else:
            print("   ✅ PASSED: Reserve fund start date is set")
        
        # Check 3: Outstanding obligations
        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        if total_obligations > 0:
            print("   ❌ FAILED: There are outstanding obligations")
        else:
            print("   ✅ PASSED: No outstanding obligations")
        
        # 3. Test basic calculator
        print("\n3. BASIC CALCULATOR TEST:")
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=True)
        
        total_reserve_fund = sum(share['reserve_fund_amount'] for share in basic_shares.values())
        print(f"   Total Reserve Fund in Basic Calculator: €{total_reserve_fund:,.2f}")
        
        # 4. Test advanced calculator
        print("\n4. ADVANCED CALCULATOR TEST:")
        try:
            advanced_calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
            )
            advanced_shares = advanced_calculator.calculate_advanced_shares()
            
            # Check the structure of advanced_shares
            print(f"   Advanced shares keys: {list(advanced_shares.keys())}")
            
            if 'shares' in advanced_shares:
                # Check the structure of the first share
                first_share_key = list(advanced_shares['shares'].keys())[0]
                first_share = advanced_shares['shares'][first_share_key]
                print(f"   First share keys: {list(first_share.keys())}")
                
                # Try to get reserve fund amount
                total_reserve_fund_advanced = 0
                for share in advanced_shares['shares'].values():
                    if 'reserve_fund_amount' in share:
                        total_reserve_fund_advanced += share['reserve_fund_amount']
                    elif 'total_amount' in share:
                        # Check if reserve fund is included in total_amount
                        print(f"   Share total_amount: €{share['total_amount']:,.2f}")
                
                print(f"   Total Reserve Fund in Advanced Calculator: €{total_reserve_fund_advanced:,.2f}")
            else:
                print("   ❌ No 'shares' key found in advanced_shares")
                
        except Exception as e:
            print(f"   ❌ Error in advanced calculator: {e}")
        
        # 5. Comparison
        print("\n5. COMPARISON:")
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        
        try:
            advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
            print(f"   Basic Calculator Total: €{basic_total:,.2f}")
            print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
            print(f"   Difference: €{advanced_total - basic_total:,.2f}")
        except Exception as e:
            print(f"   ❌ Error comparing totals: {e}")
        
        # 6. Test with forced reserve fund
        print("\n6. TEST WITH FORCED RESERVE FUND:")
        try:
            # Temporarily set reserve fund goal and start date
            original_goal = building.reserve_fund_goal
            original_start_date = building.reserve_fund_start_date
            
            building.reserve_fund_goal = 10000  # €10,000
            building.reserve_fund_start_date = '2024-01-01'
            building.save()
            
            # Test basic calculator again
            basic_calculator_forced = CommonExpenseCalculator(building_id)
            basic_shares_forced = basic_calculator_forced.calculate_shares(include_reserve_fund=True)
            
            total_reserve_fund_forced = sum(share['reserve_fund_amount'] for share in basic_shares_forced.values())
            print(f"   Total Reserve Fund (forced): €{total_reserve_fund_forced:,.2f}")
            
            # Restore original values
            building.reserve_fund_goal = original_goal
            building.reserve_fund_start_date = original_start_date
            building.save()
            
        except Exception as e:
            print(f"   ❌ Error in forced test: {e}")
        
        # 7. Recommendations
        print("\n7. RECOMMENDATIONS:")
        if not building.reserve_fund_goal or building.reserve_fund_goal <= 0:
            print("   🔧 Set a reserve fund goal (e.g., €10,000)")
        if not building.reserve_fund_start_date:
            print("   🔧 Set a reserve fund start date")
        if total_obligations > 0:
            print("   🔧 Clear outstanding obligations before collecting reserve fund")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    debug_reserve_fund_issue()
