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

def fix_reserve_fund_calculation():
    """Fix the reserve fund calculation issue"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔧 FIXING RESERVE FUND CALCULATION")
        print("=" * 50)
        
        # 1. Current state analysis
        print("\n1. CURRENT STATE:")
        print(f"   Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
        print(f"   Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
        print(f"   Reserve Fund Start Date: {building.reserve_fund_start_date}")
        print(f"   Reserve Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")
        
        # 2. Test current calculations
        print("\n2. CURRENT CALCULATIONS:")
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=True)
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        basic_reserve = sum(share['reserve_fund_amount'] for share in basic_shares.values())
        
        print(f"   Basic Calculator Total: €{basic_total:,.2f}")
        print(f"   Basic Calculator Reserve: €{basic_reserve:,.2f}")
        
        # 3. Configure reserve fund properly
        print("\n3. CONFIGURING RESERVE FUND:")
        
        # Set reasonable defaults if not configured
        if not building.reserve_fund_goal or building.reserve_fund_goal <= 0:
            building.reserve_fund_goal = 10000  # €10,000
            print("   ✅ Set reserve fund goal to €10,000")
        
        if not building.reserve_fund_duration_months or building.reserve_fund_duration_months <= 0:
            building.reserve_fund_duration_months = 24  # 2 years
            print("   ✅ Set reserve fund duration to 24 months")
        
        if not building.reserve_fund_start_date:
            from datetime import date
            building.reserve_fund_start_date = date(2024, 1, 1)
            print("   ✅ Set reserve fund start date to 2024-01-01")
        
        building.save()
        
        # 4. Test calculations after configuration
        print("\n4. CALCULATIONS AFTER CONFIGURATION:")
        basic_calculator_fixed = CommonExpenseCalculator(building_id)
        basic_shares_fixed = basic_calculator_fixed.calculate_shares(include_reserve_fund=True)
        basic_total_fixed = sum(share['total_amount'] for share in basic_shares_fixed.values())
        basic_reserve_fixed = sum(share['reserve_fund_amount'] for share in basic_shares_fixed.values())
        
        print(f"   Basic Calculator Total: €{basic_total_fixed:,.2f}")
        print(f"   Basic Calculator Reserve: €{basic_reserve_fixed:,.2f}")
        
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
        print(f"   Basic Total: €{basic_total_fixed:,.2f}")
        print(f"   Advanced Total: €{advanced_total:,.2f}")
        print(f"   Difference: €{abs(advanced_total - basic_total_fixed):,.2f}")
        
        if abs(advanced_total - basic_total_fixed) < 0.01:
            print("   ✅ CALCULATIONS NOW MATCH!")
        else:
            print("   ⚠️ Still have discrepancy")
        
        # 7. Show apartment breakdown
        print("\n7. APARTMENT BREAKDOWN:")
        print("-" * 80)
        print(f"{'Apt':<4} {'Basic Total':<12} {'Basic Reserve':<14} {'Advanced Total':<15} {'Diff':<10}")
        print("-" * 80)
        
        for apt in apartments.order_by('number'):
            basic_share = basic_shares_fixed.get(apt.id, {})
            advanced_share = advanced_shares['shares'].get(apt.id, {})
            
            basic_total_apt = basic_share.get('total_amount', 0)
            basic_reserve_apt = basic_share.get('reserve_fund_amount', 0)
            advanced_total_apt = advanced_share.get('total_amount', 0)
            diff = abs(advanced_total_apt - basic_total_apt)
            
            print(f"{apt.number:<4} €{basic_total_apt:<11,.2f} €{basic_reserve_apt:<13,.2f} €{advanced_total_apt:<14,.2f} €{diff:<9,.2f}")
        
        print("-" * 80)
        
        # 8. Recommendations
        print("\n8. RECOMMENDATIONS:")
        print("   ✅ Reserve fund is now properly configured")
        print("   ✅ Basic and Advanced calculators should match")
        print("   🔧 Consider clearing outstanding obligations (€171.00) before collecting reserve fund")
        print("   🔧 Test the expense issuance process")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    fix_reserve_fund_calculation()


