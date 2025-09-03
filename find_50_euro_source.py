#!/usr/bin/env python3
"""
Find the source of mysterious 50€ reserve fund amounts
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
from apartments.models import Apartment

def analyze_current_settings():
    """Analyze current building settings that might produce 50€"""
    
    with schema_context('demo'):
        print("🔍 ANALYZING CURRENT SETTINGS FOR 50€ SOURCE")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building_id=1)
        
        print(f"🏢 Building: {building.name}")
        print(f"   Total apartments: {apartments.count()}")
        print(f"   Reserve fund goal: {building.reserve_fund_goal}")
        print(f"   Reserve fund duration: {building.reserve_fund_duration_months}")
        print(f"   Reserve contribution per apartment: {building.reserve_contribution_per_apartment}")
        
        # Calculate potential 50€ scenarios
        print("\n🧮 Potential 50€ Calculations:")
        
        # Scenario 1: Goal/Duration = 50
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_from_goal = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"   Goal ÷ Duration: {building.reserve_fund_goal} ÷ {building.reserve_fund_duration_months} = {monthly_from_goal}€")
            
            if monthly_from_goal == 50:
                print("   ⚠️ FOUND 50€ SOURCE: Goal/Duration calculation!")
        
        # Scenario 2: Contribution per apartment × total apartments = 50
        if building.reserve_contribution_per_apartment:
            total_from_contribution = building.reserve_contribution_per_apartment * apartments.count()
            print(f"   Contribution × Apartments: {building.reserve_contribution_per_apartment} × {apartments.count()} = {total_from_contribution}€")
            
            if total_from_contribution == 50:
                print("   ⚠️ FOUND 50€ SOURCE: Per-apartment contribution calculation!")
        
        # Test dashboard service
        print("\n📊 Dashboard Service Results:")
        dashboard = FinancialDashboardService(building_id=1)
        summary = dashboard.get_summary()
        
        reserve_contribution = summary.get('reserve_fund_contribution', 0)
        monthly_target = summary.get('reserve_fund_monthly_target', 0)
        
        print(f"   Reserve fund contribution: {reserve_contribution}€")
        print(f"   Reserve fund monthly target: {monthly_target}€")
        
        if reserve_contribution == 50:
            print("   ⚠️ FOUND 50€ in reserve_fund_contribution!")
        if monthly_target == 50:
            print("   ⚠️ FOUND 50€ in reserve_fund_monthly_target!")
        
        # Test advanced calculator
        print("\n🧪 Advanced Calculator Results:")
        calc = AdvancedCommonExpenseCalculator(
            building_id=1,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=None  # Let it auto-calculate
        )
        
        result = calc.calculate_advanced_shares()
        
        if 'shares' in result and result['shares']:
            total_reserve_contributions = 0
            for apt_id, share in result['shares'].items():
                breakdown = share.get('breakdown', {})
                reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
                total_reserve_contributions += reserve_contrib
            
            print(f"   Total reserve contributions from all apartments: {total_reserve_contributions:.2f}€")
            
            if abs(total_reserve_contributions - 50) < 0.01:
                print("   ⚠️ FOUND 50€ in advanced calculator total!")
        
        # Check result metadata
        reserve_contribution_meta = result.get('reserve_contribution', 0)
        print(f"   Reserve contribution (metadata): {reserve_contribution_meta}€")
        
        if reserve_contribution_meta == 50:
            print("   ⚠️ FOUND 50€ in calculator metadata!")

def test_different_scenarios():
    """Test different scenarios that might produce 50€"""
    
    with schema_context('demo'):
        print("\n🧪 TESTING DIFFERENT SCENARIOS")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        apartments_count = Apartment.objects.filter(building_id=1).count()
        
        # Store original values
        original_goal = building.reserve_fund_goal
        original_duration = building.reserve_fund_duration_months
        original_contribution = building.reserve_contribution_per_apartment
        
        test_scenarios = [
            {
                'name': 'Current Settings',
                'goal': original_goal,
                'duration': original_duration,
                'contribution': original_contribution
            },
            {
                'name': '5€ per apartment (5×10=50)',
                'goal': original_goal,
                'duration': original_duration,
                'contribution': Decimal('5.00')
            },
            {
                'name': '1000€ over 20 months (1000÷20=50)',
                'goal': Decimal('1000.00'),
                'duration': 20,
                'contribution': original_contribution
            },
            {
                'name': '500€ over 10 months (500÷10=50)',
                'goal': Decimal('500.00'),
                'duration': 10,
                'contribution': original_contribution
            }
        ]
        
        for scenario in test_scenarios:
            print(f"\n📋 Scenario: {scenario['name']}")
            
            # Apply scenario settings
            building.reserve_fund_goal = scenario['goal']
            building.reserve_fund_duration_months = scenario['duration']
            building.reserve_contribution_per_apartment = scenario['contribution']
            building.save()
            
            # Test dashboard
            dashboard = FinancialDashboardService(building_id=1)
            summary = dashboard.get_summary()
            
            reserve_contribution = summary.get('reserve_fund_contribution', 0)
            monthly_target = summary.get('reserve_fund_monthly_target', 0)
            
            print(f"   Dashboard - Reserve contribution: {reserve_contribution}€")
            print(f"   Dashboard - Monthly target: {monthly_target}€")
            
            # Test advanced calculator
            calc = AdvancedCommonExpenseCalculator(
                building_id=1,
                period_start_date='2025-02-01',
                period_end_date='2025-02-28',
                reserve_fund_monthly_total=None
            )
            
            result = calc.calculate_advanced_shares()
            calc_reserve = result.get('reserve_contribution', 0)
            
            print(f"   Calculator - Reserve contribution: {calc_reserve}€")
            
            # Check if any value equals 50
            if any(abs(val - 50) < 0.01 for val in [reserve_contribution, monthly_target, calc_reserve]):
                print("   🎯 THIS SCENARIO PRODUCES 50€!")
                
                # Show calculation details
                if scenario['goal'] and scenario['duration']:
                    calc_monthly = float(scenario['goal']) / float(scenario['duration'])
                    print(f"      Goal÷Duration: {scenario['goal']}÷{scenario['duration']} = {calc_monthly}€")
                
                if scenario['contribution']:
                    calc_total = float(scenario['contribution']) * apartments_count
                    print(f"      Contribution×Apartments: {scenario['contribution']}×{apartments_count} = {calc_total}€")
        
        # Restore original settings
        building.reserve_fund_goal = original_goal
        building.reserve_fund_duration_months = original_duration
        building.reserve_contribution_per_apartment = original_contribution
        building.save()
        
        print("\n✅ Original settings restored")

def check_hardcoded_defaults():
    """Check for hardcoded default values in the code"""
    
    print("\n🔍 CHECKING FOR HARDCODED DEFAULTS")
    print("=" * 50)
    
    # Check common hardcoded config
    try:
        from common.hardcoded_config import DEFAULT_BUILDING_SETTINGS
        print("📄 Found hardcoded config:")
        for key, value in DEFAULT_BUILDING_SETTINGS.items():
            print(f"   {key}: {value}")
            if value == 50 or value == 5.0:
                print(f"   ⚠️ Potential 50€ source: {key} = {value}")
    except ImportError:
        print("   No hardcoded config found")
    
    # Check if any building has these default values
    with schema_context('demo'):
        buildings = Building.objects.all()
        
        print("\n🏢 Checking all buildings for 50€-related values:")
        for building in buildings:
            print(f"   Building {building.id} ({building.name}):")
            
            # Check for values that could produce 50€
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
                if abs(monthly - 50) < 0.01:
                    print(f"     ⚠️ Goal/Duration = 50€: {building.reserve_fund_goal}÷{building.reserve_fund_duration_months}")
            
            if building.reserve_contribution_per_apartment:
                apartments_count = Apartment.objects.filter(building=building).count()
                total = building.reserve_contribution_per_apartment * apartments_count
                if abs(total - 50) < 0.01:
                    print(f"     ⚠️ Contribution×Apartments = 50€: {building.reserve_contribution_per_apartment}×{apartments_count}")

def main():
    analyze_current_settings()
    test_different_scenarios()
    check_hardcoded_defaults()
    
    print("\n" + "=" * 60)
    print("🎯 SUMMARY:")
    print("   Search completed for 50€ sources in reserve fund calculations")
    print("   Check the scenarios above that produced exactly 50€")

if __name__ == "__main__":
    main()
