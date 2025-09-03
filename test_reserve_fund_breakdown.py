import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator

def test_reserve_fund_breakdown():
    """Test if Reserve Fund appears in apartment breakdowns"""
    
    with schema_context('demo'):
        print("🔍 Testing Reserve Fund in apartment breakdowns...")
        
        # Test with building ID 1 for August 2025 (within reserve fund period)
        building_id = 1
        
        # First check if building exists
        from buildings.models import Building
        try:
            building = Building.objects.get(id=building_id)
            print(f"   Building found: {building.name}")
        except Building.DoesNotExist:
            print(f"   Building ID {building_id} not found")
            return
        
        # Check building's Reserve Fund settings
        print("\n🔍 Building Reserve Fund Settings:")
        print(f"   reserve_fund_start_date: {building.reserve_fund_start_date}")
        print(f"   reserve_fund_target_date: {building.reserve_fund_target_date}")
        print(f"   reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        
        calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=None  # Let it calculate from building settings
        )
        
        # Debug: Check reserve fund monthly total calculation
        print("\n🔍 Reserve Fund Calculation Debug:")
        print(f"   reserve_fund_monthly_total: {calculator.reserve_fund_monthly_total}")
        print(f"   building.reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   building.reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            print(f"   Expected monthly calculation: {building.reserve_fund_goal} / {building.reserve_fund_duration_months} = {expected_monthly}€")
        
        # Debug: Check FinancialDashboardService
        from financial.services import FinancialDashboardService
        dashboard_service = FinancialDashboardService(building_id)
        summary = dashboard_service.get_summary()
        print("\n🔍 FinancialDashboardService Debug:")
        print(f"   summary.reserve_fund_contribution: {summary.get('reserve_fund_contribution', 'NOT_FOUND')}")
        print(f"   summary keys: {list(summary.keys())}")
        
        # Check if we can calculate it manually
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            manual_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            print(f"   Manual monthly calculation: {manual_monthly}€")
        
        result = calculator.calculate_advanced_shares()
        
        print("\n📊 API Response Analysis for August 2025:")
        print(f"   Building ID: {building_id}")
        print("   Selected Month: 2025-08")
        print(f"   Response Keys: {list(result.keys())}")
        
        # Check Reserve Fund timeline data
        print("\n🔍 Reserve Fund Timeline Data:")
        print(f"   reserve_fund_start_date: {result.get('reserve_fund_start_date')}")
        print(f"   reserve_fund_target_date: {result.get('reserve_fund_target_date')}")
        print(f"   reserve_contribution: {result.get('reserve_contribution', 0)}€")
        
        # Timeline check for August 2025
        from datetime import date
        selected_date = date(2025, 8, 1)
        start_date_str = result.get('reserve_fund_start_date')
        target_date_str = result.get('reserve_fund_target_date')
        
        if start_date_str and target_date_str:
            from datetime import datetime
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            
            is_after_start = selected_date >= start_date
            is_before_end = selected_date <= target_date
            should_show = is_after_start and is_before_end
            
            print("\n📅 Timeline Check for August 2025:")
            print(f"   Selected Date: {selected_date}")
            print(f"   Start Date: {start_date}")
            print(f"   Target Date: {target_date}")
            print(f"   Is After Start: {is_after_start}")
            print(f"   Is Before End: {is_before_end}")
            print(f"   Should Show Reserve Fund: {should_show}")
        
        # Check apartment shares breakdown
        shares = result.get('shares', {})
        print("\n🏠 Apartment Breakdown Analysis:")
        print(f"   Total apartments: {len(shares)}")
        
        # Check if apartments have obligations that prevent reserve fund collection
        print("\n🔍 Apartment Obligations Check:")
        for apt_id, share_data in list(shares.items())[:3]:  # Show first 3 apartments
            breakdown = share_data.get('breakdown', {})
            current_balance = share_data.get('current_balance', 0)
            previous_balance = share_data.get('previous_balance', 0)
            
            print(f"\n   Apartment {share_data.get('apartment_number', apt_id)}:")
            print(f"     current_balance: {current_balance}€")
            print(f"     previous_balance: {previous_balance}€")
            print(f"     general_expenses: {breakdown.get('general_expenses', 0)}€")
            print(f"     elevator_expenses: {breakdown.get('elevator_expenses', 0)}€")
            print(f"     heating_expenses: {breakdown.get('heating_expenses', 0)}€")
            print(f"     equal_share_expenses: {breakdown.get('equal_share_expenses', 0)}€")
            print(f"     individual_expenses: {breakdown.get('individual_expenses', 0)}€")
            print(f"     reserve_fund_contribution: {breakdown.get('reserve_fund_contribution', 0)}€")
            print(f"     management_fee: {breakdown.get('management_fee', 0)}€")
            print(f"     total_amount: {share_data.get('total_amount', 0)}€")
            
            # Check if this apartment has obligations that prevent reserve fund
            has_obligations = float(current_balance) < 0 or float(previous_balance) < 0
            print(f"     Has obligations: {has_obligations}")
        
        # Check if reserve fund contribution is missing
        reserve_contributions = [
            share_data.get('breakdown', {}).get('reserve_fund_contribution', 0)
            for share_data in shares.values()
        ]
        
        total_reserve = sum(float(contrib) for contrib in reserve_contributions)
        max_reserve = max(float(contrib) for contrib in reserve_contributions) if reserve_contributions else 0
        
        print("\n🔍 Reserve Fund Summary:")
        print(f"   Total Reserve Contributions: {total_reserve}€")
        print(f"   Max Individual Contribution: {max_reserve}€")
        
        if total_reserve == 0:
            print("   ❌ Reserve Fund contributions are all zero!")
            print("   This explains why Reserve Fund doesn't appear in analysis")
        else:
            print("   ✅ Reserve Fund contributions are calculated")

if __name__ == "__main__":
    test_reserve_fund_breakdown()
