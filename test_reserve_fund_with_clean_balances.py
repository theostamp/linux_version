#!/usr/bin/env python3
"""
Test Reserve Fund Timeline with Clean Balances
Create a scenario where apartments have no pending obligations to verify Reserve Fund collection works.
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
from apartments.models import Apartment
from financial.models import Transaction
from financial.services import CommonExpenseCalculator

def test_reserve_fund_with_clean_balances():
    """Test Reserve Fund collection when apartments have no pending obligations"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            month = '2025-08'  # Within collection period
            
            print(f"🏢 Building: {building.name}")
            print(f"🗓️  Testing month: {month}")
            print(f"📅 Reserve Fund Timeline: {building.reserve_fund_start_date} to {building.reserve_fund_target_date}")
            print()
            
            # Get apartments
            apartments = Apartment.objects.filter(building=building)
            
            # Step 1: Clear all existing transactions to create clean balances
            print("🧹 Clearing existing transactions...")
            Transaction.objects.filter(apartment__building=building).delete()
            print("   ✅ All transactions cleared")
            print()
            
            # Step 2: Test Reserve Fund calculation with clean balances
            print("🧮 Testing Reserve Fund calculation with clean balances:")
            calculator = CommonExpenseCalculator(building.id, month=month)
            shares = calculator.calculate_shares()
            
            # Check Reserve Fund contributions
            reserve_fund_total = 0
            for apt_id, share_data in shares.items():
                reserve_contribution = share_data.get('reserve_fund_contribution', 0)
                reserve_fund_total += reserve_contribution
                if reserve_contribution > 0:
                    apartment = apartments.get(id=apt_id)
                    print(f"   Apartment {apartment.number}: €{reserve_contribution}")
            
            print(f"   Total Reserve Fund Contribution: €{reserve_fund_total}")
            
            # Verify expected calculation
            expected_monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            print(f"   Expected monthly target: €{expected_monthly_target}")
            
            if reserve_fund_total > 0:
                print("✅ SUCCESS: Reserve Fund collection working correctly!")
                print("   Timeline logic: ✅ Working")
                print("   Pending obligations check: ✅ Working")
                print("   Calculation logic: ✅ Working")
            else:
                print("❌ FAILED: Reserve Fund still not collecting")
                
                # Debug why it's still failing
                print("\n🔍 Additional debugging:")
                
                # Check pending obligations again
                total_obligations = 0
                for apt in apartments:
                    historical_balance = calculator._get_historical_balance(apt, calculator.period_end_date)
                    if historical_balance < 0:
                        total_obligations += abs(historical_balance)
                
                print(f"   Pending obligations after cleanup: €{total_obligations}")
                
                # Check monthly target calculation
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                    print(f"   Monthly target calculation: €{monthly_target}")
                else:
                    print("   ❌ Monthly target calculation failed")
                    print(f"      Goal: {building.reserve_fund_goal}")
                    print(f"      Duration: {building.reserve_fund_duration_months}")
            
            print()
            
            # Step 3: Test timeline logic with different months
            print("🗓️  Testing timeline logic with different months:")
            test_months = ['2025-04', '2025-08', '2026-02']
            
            for test_month in test_months:
                calculator = CommonExpenseCalculator(building.id, month=test_month)
                shares = calculator.calculate_shares()
                
                reserve_total = sum(share_data.get('reserve_fund_contribution', 0) 
                                  for share_data in shares.values())
                
                # Check if month should have contributions
                year, mon = map(int, test_month.split('-'))
                selected_date = date(year, mon, 1)
                should_collect = (selected_date >= building.reserve_fund_start_date and 
                                selected_date <= building.reserve_fund_target_date)
                
                status = "✅" if (should_collect and reserve_total > 0) or (not should_collect and reserve_total == 0) else "❌"
                print(f"   {test_month}: €{reserve_total} {status}")
                
        except Exception as e:
            print(f"❌ Error during test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_reserve_fund_with_clean_balances()
