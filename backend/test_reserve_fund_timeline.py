#!/usr/bin/env python3
"""
Test Reserve Fund Timeline Logic
Tests that Reserve Fund contributions are only charged during the configured collection period.
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def test_reserve_fund_timeline():
    """Test Reserve Fund timeline logic for different months"""
    
    with schema_context('demo'):
        # Get Alkmanos building (ID 1) which has Reserve Fund configured
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Testing building: {building.name}")
            print(f"📅 Reserve Fund Start Date: {building.reserve_fund_start_date}")
            print(f"🎯 Reserve Fund Target Date: {building.reserve_fund_target_date}")
            print(f"💰 Reserve Fund Goal: {building.reserve_fund_goal}")
            print(f"📊 Reserve Fund Duration: {building.reserve_fund_duration_months} months")
            print()
            
            # Test different months based on actual timeline: 2025-07-31 to 2026-01-30
            test_months = [
                '2025-04',  # Before timeline (should be 0)
                '2025-06',  # Before timeline (should be 0) 
                '2025-07',  # Should be 0 (starts July 31, so July shouldn't have contribution)
                '2025-08',  # Start of timeline (should have contribution)
                '2025-12',  # During timeline (should have contribution)
                '2026-01',  # End of timeline (should have contribution)
                '2026-02',  # After timeline (should be 0)
            ]
            
            for month in test_months:
                print(f"🗓️  Testing month: {month}")
                
                # Create calculator for this month
                calculator = CommonExpenseCalculator(building.id, month=month)
                
                # Calculate shares (this will trigger Reserve Fund calculation)
                shares = calculator.calculate_shares()
                
                # Check if any apartment has Reserve Fund contribution
                reserve_fund_total = 0
                for apt_id, share_data in shares.items():
                    reserve_contribution = share_data.get('reserve_fund_contribution', 0)
                    reserve_fund_total += reserve_contribution
                
                print(f"   💸 Total Reserve Fund Contribution: €{reserve_fund_total}")
                
                # Determine if month should have contributions
                if building.reserve_fund_start_date and building.reserve_fund_target_date:
                    year, mon = map(int, month.split('-'))
                    selected_month_date = date(year, mon, 1)
                    
                    should_have_contribution = (
                        selected_month_date >= building.reserve_fund_start_date and
                        selected_month_date <= building.reserve_fund_target_date
                    )
                    
                    if should_have_contribution and reserve_fund_total > 0:
                        print(f"   ✅ CORRECT: Month is within timeline and has contributions")
                    elif not should_have_contribution and reserve_fund_total == 0:
                        print(f"   ✅ CORRECT: Month is outside timeline and has no contributions")
                    elif should_have_contribution and reserve_fund_total == 0:
                        print(f"   ❌ ERROR: Month should have contributions but doesn't")
                    else:
                        print(f"   ❌ ERROR: Month shouldn't have contributions but does")
                else:
                    print(f"   ⚠️  WARNING: No timeline configured")
                
                print()
                
        except Building.DoesNotExist:
            print("❌ Building with ID 2 not found")
            return
        except Exception as e:
            print(f"❌ Error during test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_reserve_fund_timeline()
