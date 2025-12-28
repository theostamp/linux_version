#!/usr/bin/env python3
"""
Set up proper reserve fund goal and duration for building to test filtering
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
from buildings.models import Building

def setup_reserve_fund():
    """Set up reserve fund goal and duration for the building"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        
        try:
            building = Building.objects.get(id=building_id)
            
            print(f"🏢 Setting up reserve fund for: {building.name}")
            print("=" * 50)
            
            # Current settings
            print("Current settings:")
            print(f"- Reserve fund goal: {getattr(building, 'reserve_fund_goal', 'Not set')}")
            print(f"- Reserve fund duration: {getattr(building, 'reserve_fund_duration', 'Not set')}")
            print(f"- Reserve fund start date: {getattr(building, 'reserve_fund_start_date', 'Not set')}")
            
            # Set up reasonable reserve fund settings
            # Goal: 1000€ over 12 months = ~83.33€ per month for the building
            # Per apartment: 83.33€ / 10 apartments = ~8.33€ per apartment per month
            
            if hasattr(building, 'reserve_fund_goal'):
                building.reserve_fund_goal = Decimal('1000.00')
                print("\n✅ Set reserve_fund_goal to: 1000€")
            else:
                print("\n⚠️ Building model doesn't have reserve_fund_goal field")
            
            if hasattr(building, 'reserve_fund_duration'):
                building.reserve_fund_duration = 12
                print("✅ Set reserve_fund_duration to: 12 months")
            else:
                print("⚠️ Building model doesn't have reserve_fund_duration field")
            
            if hasattr(building, 'reserve_fund_start_date'):
                from datetime import date
                building.reserve_fund_start_date = date(2025, 1, 1)
                print("✅ Set reserve_fund_start_date to: 2025-01-01")
            else:
                print("⚠️ Building model doesn't have reserve_fund_start_date field")
            
            # Save changes
            building.save()
            print("\n💾 Building settings saved!")
            
            # Verify the changes
            building.refresh_from_db()
            print("\nVerification:")
            print(f"- Reserve fund goal: {getattr(building, 'reserve_fund_goal', 'Not found')}")
            print(f"- Reserve fund duration: {getattr(building, 'reserve_fund_duration', 'Not found')}")
            print(f"- Reserve fund start date: {getattr(building, 'reserve_fund_start_date', 'Not found')}")
            
            # Calculate expected monthly amounts
            if hasattr(building, 'reserve_fund_goal') and hasattr(building, 'reserve_fund_duration'):
                goal = building.reserve_fund_goal or 0
                duration = building.reserve_fund_duration or 1
                monthly_building_total = goal / duration
                monthly_per_apartment = monthly_building_total / building.apartments.count()
                
                print("\nExpected calculations:")
                print(f"- Monthly total for building: {monthly_building_total:.2f}€")
                print(f"- Monthly per apartment: {monthly_per_apartment:.2f}€")
            
        except Building.DoesNotExist:
            print(f"❌ Building with ID {building_id} not found")
        except Exception as e:
            print(f"❌ Error: {e}")

def test_reserve_fund_after_setup():
    """Test reserve fund calculations after setup"""
    
    with schema_context('demo'):
        building_id = 1
        
        print("\n🧪 Testing Reserve Fund After Setup")
        print("=" * 50)
        
        from financial.services import AdvancedCommonExpenseCalculator
        from datetime import date, timedelta
        
        # Test February 2025
        month = "2025-02"
        year, month_num = month.split('-')
        year, month_num = int(year), int(month_num)
        
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num + 1, 1) - timedelta(days=1)
        
        period_start = start_date.strftime('%Y-%m-%d')
        period_end = end_date.strftime('%Y-%m-%d')
        
        # Test with different reserve fund amounts
        test_amounts = [0, 50, 83.33]  # 0, custom, expected monthly
        
        for amount in test_amounts:
            print(f"\n📅 Testing {month} with reserve amount: {amount}€")
            
            try:
                calculator = AdvancedCommonExpenseCalculator(
                    building_id=building_id,
                    period_start_date=period_start,
                    period_end_date=period_end,
                    reserve_fund_monthly_total=Decimal(str(amount))
                )
                
                result = calculator.calculate_advanced_shares()
                
                print(f"   - Goal: {result.get('reserve_fund_goal', 0)}€")
                print(f"   - Duration: {result.get('reserve_fund_duration', 0)} months")
                print(f"   - Contribution: {result.get('reserve_contribution', 0)}€")
                print(f"   - Current reserve: {result.get('current_reserve', 0)}€")
                
                # Check first apartment share
                shares = result.get('shares', {})
                if shares:
                    first_apt_id = list(shares.keys())[0]
                    first_share = shares[first_apt_id]
                    total_amount = first_share.get('total_amount', 0)
                    breakdown = first_share.get('breakdown', {})
                    reserve_contribution = breakdown.get('reserve_fund_contribution', 0)
                    
                    print(f"   - Sample apartment total: {total_amount}€")
                    print(f"   - Sample apartment reserve: {reserve_contribution}€")
                
            except Exception as e:
                print(f"   ❌ Error: {e}")

def main():
    """Main function"""
    setup_reserve_fund()
    test_reserve_fund_after_setup()
    
    print("\n" + "=" * 60)
    print("🏁 Reserve Fund Setup Complete!")
    print("\nNext steps:")
    print("- Test frontend to see if reserve fund appears correctly")
    print("- Verify month filtering works with reserve fund")
    print("- Check if reserve fund data persists properly")

if __name__ == "__main__":
    main()
