#!/usr/bin/env python3
"""
Debug script to understand why distribution data is not returned
"""

import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator, CommonExpenseCalculator
from apartments.models import Apartment
from buildings.models import Building

def debug_calculator():
    """Debug the calculator to see what's happening"""
    
    with schema_context('demo'):
        building_id = 1
        
        print("🔍 DEBUGGING CALCULATOR ISSUE")
        print("=" * 50)
        
        # Test February 2025 (no ΔΕΗ, only management fees)
        period_start = '2025-02-01'
        period_end = '2025-02-28'
        
        print(f"Testing period: {period_start} to {period_end}")
        
        try:
            # Test regular calculator first
            print("\n📊 Testing CommonExpenseCalculator:")
            regular_calc = CommonExpenseCalculator(building_id=building_id, month='2025-02')
            regular_result = regular_calc.calculate_shares()
            
            print(f"Regular calculator result keys: {list(regular_result.keys())}")
            
            if 'shares' in regular_result:
                shares = regular_result['shares']
                print(f"Number of shares: {len(shares)}")
                
                # Show first apartment data
                first_apt_id = list(shares.keys())[0] if shares else None
                if first_apt_id:
                    first_share = shares[first_apt_id]
                    print(f"First apartment data: {json.dumps(first_share, indent=2, default=str)}")
            
            # Test advanced calculator
            print("\n📊 Testing AdvancedCommonExpenseCalculator:")
            advanced_calc = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date=period_start,
                period_end_date=period_end,
                reserve_fund_monthly_total=Decimal('0')
            )
            advanced_result = advanced_calc.calculate_advanced_shares()
            
            print(f"Advanced calculator result keys: {list(advanced_result.keys())}")
            
            if 'shares' in advanced_result:
                shares = advanced_result['shares']
                print(f"Number of shares: {len(shares)}")
                
                # Show first apartment data
                first_apt_id = list(shares.keys())[0] if shares else None
                if first_apt_id:
                    first_share = shares[first_apt_id]
                    print(f"First apartment data: {json.dumps(first_share, indent=2, default=str)}")
                    
                    # Check breakdown
                    breakdown = first_share.get('breakdown', {})
                    print(f"Breakdown keys: {list(breakdown.keys())}")
                    
                    mgmt_fee = breakdown.get('management_fee', 0)
                    print(f"Management fee: {mgmt_fee}")
            
            # Test with reserve fund
            print("\n📊 Testing with Reserve Fund:")
            advanced_calc_reserve = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date=period_start,
                period_end_date=period_end,
                reserve_fund_monthly_total=Decimal('100')
            )
            reserve_result = advanced_calc_reserve.calculate_advanced_shares()
            
            if 'shares' in reserve_result:
                shares = reserve_result['shares']
                first_apt_id = list(shares.keys())[0] if shares else None
                if first_apt_id:
                    first_share = shares[first_apt_id]
                    breakdown = first_share.get('breakdown', {})
                    
                    mgmt_fee = breakdown.get('management_fee', 0)
                    reserve_contrib = breakdown.get('reserve_fund_contribution', 0)
                    
                    print(f"Management fee: {mgmt_fee}")
                    print(f"Reserve contribution: {reserve_contrib}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

def check_building_settings():
    """Check building management fee settings"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            print("\n🏢 Building Settings:")
            print(f"Name: {building.name}")
            print(f"Management fee per apartment: {building.management_fee_per_apartment}")
            
            apartments = Apartment.objects.filter(building_id=1).order_by('number')
            print(f"Total apartments: {apartments.count()}")
            
            # Calculate expected total management fee
            expected_total = building.management_fee_per_apartment * apartments.count()
            print(f"Expected total management fee: {expected_total}€")
            
        except Exception as e:
            print(f"❌ Error checking building: {e}")

def main():
    check_building_settings()
    debug_calculator()

if __name__ == "__main__":
    main()
