#!/usr/bin/env python3
"""
Search for hardcoded fallback values and default amounts in the financial system
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService, AdvancedCommonExpenseCalculator
from buildings.models import Building

def check_hardcoded_values():
    """Check for hardcoded values in the system"""
    
    with schema_context('demo'):
        print("🔍 SEARCHING FOR HARDCODED FALLBACK VALUES")
        print("=" * 60)
        
        # Check building settings
        building = Building.objects.get(id=1)
        
        print(f"🏢 Building: {building.name}")
        print(f"   Reserve fund goal: {building.reserve_fund_goal}")
        print(f"   Reserve fund duration: {building.reserve_fund_duration_months}")
        print(f"   Reserve contribution per apartment: {building.reserve_contribution_per_apartment}")
        print(f"   Management fee per apartment: {building.management_fee_per_apartment}")
        
        # Test dashboard service with different scenarios
        print("\n🧪 Testing Dashboard Service Fallbacks:")
        
        # Scenario 1: Current building settings
        dashboard = FinancialDashboardService(building_id=1)
        summary = dashboard.get_summary()
        
        print(f"   Current reserve fund contribution: {summary.get('reserve_fund_contribution', 'NOT_FOUND')}")
        print(f"   Current reserve fund goal: {summary.get('reserve_fund_goal', 'NOT_FOUND')}")
        print(f"   Current reserve fund monthly target: {summary.get('reserve_fund_monthly_target', 'NOT_FOUND')}")
        
        # Scenario 2: Clear reserve settings and test fallbacks
        print("\n🧪 Testing with Cleared Reserve Settings:")
        
        original_goal = building.reserve_fund_goal
        original_duration = building.reserve_fund_duration_months
        original_contribution = building.reserve_contribution_per_apartment
        
        # Temporarily clear settings
        building.reserve_fund_goal = None
        building.reserve_fund_duration_months = None
        building.reserve_contribution_per_apartment = None
        building.save()
        
        # Test dashboard with cleared settings
        dashboard_cleared = FinancialDashboardService(building_id=1)
        summary_cleared = dashboard_cleared.get_summary()
        
        print(f"   Reserve fund contribution (cleared): {summary_cleared.get('reserve_fund_contribution', 'NOT_FOUND')}")
        print(f"   Reserve fund goal (cleared): {summary_cleared.get('reserve_fund_goal', 'NOT_FOUND')}")
        print(f"   Reserve fund monthly target (cleared): {summary_cleared.get('reserve_fund_monthly_target', 'NOT_FOUND')}")
        
        # Test advanced calculator with cleared settings
        calc_cleared = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=None  # Let it calculate automatically
        )
        
        result_cleared = calc_cleared.calculate_advanced_shares()
        
        if 'shares' in result_cleared and result_cleared['shares']:
            first_share = list(result_cleared['shares'].values())[0]
            breakdown = first_share.get('breakdown', {})
            reserve_contrib = breakdown.get('reserve_fund_contribution', 'NOT_FOUND')
            print(f"   Advanced calculator reserve (cleared): {reserve_contrib}")
        
        # Restore original settings
        building.reserve_fund_goal = original_goal
        building.reserve_fund_duration_months = original_duration
        building.reserve_contribution_per_apartment = original_contribution
        building.save()
        
        # Scenario 3: Test with specific problematic values
        print("\n🧪 Testing with Specific Values that might cause 50€:")
        
        # Test with reserve_contribution_per_apartment = 5€ (5€ * 10 apartments = 50€)
        building.reserve_contribution_per_apartment = Decimal('5.00')
        building.reserve_fund_goal = None
        building.reserve_fund_duration_months = None
        building.save()
        
        dashboard_test = FinancialDashboardService(building_id=1)
        summary_test = dashboard_test.get_summary()
        
        print("   With 5€ per apartment contribution:")
        print(f"     Reserve fund contribution: {summary_test.get('reserve_fund_contribution', 'NOT_FOUND')}")
        print(f"     Expected: {5.00 * 10} (5€ × 10 apartments)")
        
        # Test advanced calculator with this setting
        calc_test = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=None
        )
        
        result_test = calc_test.calculate_advanced_shares()
        
        if 'shares' in result_test and result_test['shares']:
            print("     Advanced calculator shares with 5€ per apartment:")
            for apt_id, share in list(result_test['shares'].items())[:3]:  # Show first 3
                breakdown = share.get('breakdown', {})
                reserve_contrib = breakdown.get('reserve_fund_contribution', 0)
                apt_number = share.get('apartment_number', apt_id)
                participation_mills = share.get('participation_mills', 0)
                expected = (participation_mills / 1000) * 50  # 50€ total
                print(f"       {apt_number}: {reserve_contrib}€ (expected: {expected:.2f}€)")
        
        # Restore original settings
        building.reserve_fund_goal = original_goal
        building.reserve_fund_duration_months = original_duration
        building.reserve_contribution_per_apartment = original_contribution
        building.save()
        
        print("\n🔍 CHECKING FOR HARDCODED VALUES IN CODE:")
        
        # Check if there are any hardcoded defaults in the services
        print("   Looking for common hardcoded values...")
        
        # Test edge cases that might trigger defaults
        test_cases = [
            {"goal": 0, "duration": 0, "contribution": 0},
            {"goal": None, "duration": None, "contribution": None},
            {"goal": 1000, "duration": 20, "contribution": 5},  # 1000/20 = 50
        ]
        
        for i, case in enumerate(test_cases):
            print(f"\n   Test Case {i+1}: goal={case['goal']}, duration={case['duration']}, contribution={case['contribution']}")
            
            building.reserve_fund_goal = case['goal']
            building.reserve_fund_duration_months = case['duration']
            building.reserve_contribution_per_apartment = case['contribution']
            building.save()
            
            dashboard_case = FinancialDashboardService(building_id=1)
            summary_case = dashboard_case.get_summary()
            
            reserve_contribution = summary_case.get('reserve_fund_contribution', 0)
            monthly_target = summary_case.get('reserve_fund_monthly_target', 0)
            
            print(f"     Result: contribution={reserve_contribution}, monthly_target={monthly_target}")
            
            if reserve_contribution == 50 or monthly_target == 50:
                print("     ⚠️ FOUND 50€! This might be the source.")
        
        # Restore original settings
        building.reserve_fund_goal = original_goal
        building.reserve_fund_duration_months = original_duration
        building.reserve_contribution_per_apartment = original_contribution
        building.save()
        
        print("\n" + "=" * 60)
        print("🎯 SUMMARY OF FINDINGS:")
        print("   Original settings restored:")
        print(f"     Reserve fund goal: {original_goal}")
        print(f"     Reserve fund duration: {original_duration}")
        print(f"     Reserve contribution per apartment: {original_contribution}")

def main():
    check_hardcoded_values()

if __name__ == "__main__":
    main()
