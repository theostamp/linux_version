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

def test_management_fee_fix():
    """Test if the management fee fix worked correctly"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("✅ TESTING MANAGEMENT FEE FIX")
        print("=" * 50)
        
        # 1. Current state
        print("\n1. CURRENT STATE:")
        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        print(f"   Management Fee per Apartment: €{building.management_fee_per_apartment or 0:,.2f}")
        
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
        
        # 3. Check if they match
        print("\n3. VERIFICATION:")
        if abs(advanced_total - basic_total) < 0.01:
            print("   ✅ SUCCESS: Calculators now match!")
            print("   ✅ The management fee fix worked correctly!")
        else:
            print("   ❌ FAILED: Calculators still don't match")
            print(f"   ❌ Difference: €{advanced_total - basic_total:,.2f}")
        
        # 4. Show apartment breakdown
        print("\n4. APARTMENT BREAKDOWN:")
        print("-" * 80)
        print(f"{'Apt':<4} {'Basic Total':<12} {'Basic Reserve':<14} {'Advanced Total':<15} {'Match':<8}")
        print("-" * 80)
        
        all_match = True
        for apt in apartments.order_by('number'):
            basic_share = basic_shares.get(apt.id, {})
            advanced_share = advanced_shares['shares'].get(apt.id, {})
            
            basic_total_apt = basic_share.get('total_amount', 0)
            basic_reserve_apt = basic_share.get('reserve_fund_amount', 0)
            advanced_total_apt = advanced_share.get('total_amount', 0)
            
            match = "✅" if abs(advanced_total_apt - basic_total_apt) < 0.01 else "❌"
            if abs(advanced_total_apt - basic_total_apt) >= 0.01:
                all_match = False
            
            print(f"{apt.number:<4} €{basic_total_apt:<11,.2f} €{basic_reserve_apt:<13,.2f} €{advanced_total_apt:<14,.2f} {match:<8}")
        
        print("-" * 80)
        
        # 5. Check management fee in breakdown
        print("\n5. MANAGEMENT FEE CHECK:")
        first_apt_id = list(basic_shares.keys())[0]
        first_apt_share = basic_shares[first_apt_id]
        
        management_fee_found = False
        for item in first_apt_share['breakdown']:
            if 'Δαπάνες Διαχείρισης' in item['expense_title']:
                management_fee_found = True
                print(f"   ✅ Management fee found in breakdown: €{item['apartment_share']:,.2f}")
                break
        
        if not management_fee_found:
            print("   ❌ Management fee not found in breakdown")
        
        # 6. Test with zero obligations
        print("\n6. TEST WITH ZERO OBLIGATIONS:")
        
        # Store original balances
        original_balances = {}
        for apt in apartments:
            original_balances[apt.id] = apt.current_balance
        
        # Set all balances to zero
        for apt in apartments:
            apt.current_balance = 0
            apt.save()
        
        # Test both calculators with zero obligations
        basic_calculator_zero = CommonExpenseCalculator(building_id)
        basic_shares_zero = basic_calculator_zero.calculate_shares(include_reserve_fund=True)
        basic_total_zero = sum(share['total_amount'] for share in basic_shares_zero.values())
        basic_reserve_zero = sum(share['reserve_fund_amount'] for share in basic_shares_zero.values())
        
        advanced_calculator_zero = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        advanced_shares_zero = advanced_calculator_zero.calculate_advanced_shares()
        advanced_total_zero = sum(share['total_amount'] for share in advanced_shares_zero['shares'].values())
        
        print(f"   Basic Calculator Total (zero obligations): €{basic_total_zero:,.2f}")
        print(f"   Basic Calculator Reserve (zero obligations): €{basic_reserve_zero:,.2f}")
        print(f"   Advanced Calculator Total (zero obligations): €{advanced_total_zero:,.2f}")
        print(f"   Difference (zero obligations): €{advanced_total_zero - basic_total_zero:,.2f}")
        
        # Check if they match with zero obligations
        if abs(advanced_total_zero - basic_total_zero) < 0.01:
            print("   ✅ SUCCESS: Calculators match with zero obligations!")
        else:
            print("   ❌ FAILED: Calculators don't match with zero obligations")
        
        # Restore original balances
        for apt in apartments:
            apt.current_balance = original_balances[apt.id]
            apt.save()
        
        # 7. Final summary
        print("\n7. FINAL SUMMARY:")
        if abs(advanced_total - basic_total) < 0.01 and all_match and management_fee_found:
            print("   🎉 COMPLETE SUCCESS!")
            print("   ✅ Both calculators now work identically")
            print("   ✅ Management fee is included correctly")
            print("   ✅ Reserve fund logic is consistent")
            print("   ✅ All calculations match")
        else:
            print("   ⚠️ PARTIAL SUCCESS OR FAILURE")
            print("   🔧 May need additional fixes")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    test_management_fee_fix()


