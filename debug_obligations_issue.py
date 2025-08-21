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

def debug_obligations_issue():
    """Debug why obligations check prevents reserve fund calculation"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔍 DEBUGGING OBLIGATIONS ISSUE")
        print("=" * 50)
        
        # 1. Check apartment balances
        print("\n1. APARTMENT BALANCES:")
        total_obligations = 0
        for apt in apartments.order_by('number'):
            balance = apt.current_balance or 0
            abs_balance = abs(balance)
            total_obligations += abs_balance
            print(f"   Apartment {apt.number}: €{balance:,.2f} (abs: €{abs_balance:,.2f})")
        
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        
        # 2. Check the obligations calculation in the calculator
        print("\n2. OBLIGATIONS CALCULATION IN BASIC CALCULATOR:")
        basic_calculator = CommonExpenseCalculator(building_id)
        
        # Simulate the check from _calculate_reserve_fund_contribution
        calculator_obligations = sum(abs(apt.current_balance or 0) for apt in basic_calculator.apartments)
        print(f"   Calculator Obligations: €{calculator_obligations:,.2f}")
        
        # 3. Check if obligations > 0 prevents reserve fund
        print("\n3. RESERVE FUND CHECKS:")
        print(f"   Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
        print(f"   Reserve Fund Start Date: {building.reserve_fund_start_date}")
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        
        # Simulate the checks
        if not building.reserve_fund_goal or building.reserve_fund_goal <= 0:
            print("   ❌ FAILED: Reserve fund goal is not set or is zero")
        else:
            print("   ✅ PASSED: Reserve fund goal is set")
        
        if not building.reserve_fund_start_date:
            print("   ❌ FAILED: Reserve fund start date is not set")
        else:
            print("   ✅ PASSED: Reserve fund start date is set")
        
        if total_obligations > 0:
            print("   ❌ FAILED: There are outstanding obligations")
        else:
            print("   ✅ PASSED: No outstanding obligations")
        
        # 4. Test with zero obligations (temporarily)
        print("\n4. TEST WITH ZERO OBLIGATIONS:")
        
        # Store original balances
        original_balances = {}
        for apt in apartments:
            original_balances[apt.id] = apt.current_balance
        
        # Set all balances to zero
        for apt in apartments:
            apt.current_balance = 0
            apt.save()
        
        # Test basic calculator
        basic_calculator_zero = CommonExpenseCalculator(building_id)
        basic_shares_zero = basic_calculator_zero.calculate_shares(include_reserve_fund=True)
        basic_total_zero = sum(share['total_amount'] for share in basic_shares_zero.values())
        basic_reserve_zero = sum(share['reserve_fund_amount'] for share in basic_shares_zero.values())
        
        print(f"   Basic Calculator Total (zero obligations): €{basic_total_zero:,.2f}")
        print(f"   Basic Calculator Reserve (zero obligations): €{basic_reserve_zero:,.2f}")
        
        # Restore original balances
        for apt in apartments:
            apt.current_balance = original_balances[apt.id]
            apt.save()
        
        # 5. Test advanced calculator
        print("\n5. ADVANCED CALCULATOR TEST:")
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        advanced_shares = advanced_calculator.calculate_advanced_shares()
        advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
        
        print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
        
        # 6. Comparison
        print("\n6. COMPARISON:")
        print(f"   Basic Total (with obligations): €{basic_total_zero + sum(abs(apt.current_balance or 0) for apt in apartments):,.2f}")
        print(f"   Advanced Total: €{advanced_total:,.2f}")
        
        # 7. Recommendations
        print("\n7. RECOMMENDATIONS:")
        if total_obligations > 0:
            print("   🔧 The Basic Calculator correctly prevents reserve fund collection due to obligations")
            print("   🔧 The Advanced Calculator ignores this check and includes reserve fund anyway")
            print("   🔧 This creates the €230.00 discrepancy")
            print("   🔧 Decide on the policy: collect reserve fund with obligations or not?")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    debug_obligations_issue()

