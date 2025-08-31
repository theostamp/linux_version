import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import datetime, date
from decimal import Decimal

with schema_context('demo'):
    from buildings.models import Building
    
    print("=== RESERVE FUND START DATE INVESTIGATION ===")
    print(f"Investigation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check building reserve fund settings
    building = Building.objects.get(id=1)  # Αλκμάνος 22
    
    print(f"🏢 Building: {building.name}")
    print(f"📅 Reserve Fund Start Date: {building.reserve_fund_start_date}")
    print(f"📅 Reserve Fund Target Date: {building.reserve_fund_target_date}")
    print(f"🎯 Reserve Fund Goal: {building.reserve_fund_goal}€")
    print(f"⏱️ Duration: {building.reserve_fund_duration_months} months")
    print()
    
    # Check if May 2025 should have reserve fund contributions
    test_month = "2025-05"
    year, month = map(int, test_month.split('-'))
    selected_date = date(year, month, 1)
    
    print(f"🔍 Testing month: {test_month} (date: {selected_date})")
    
    if building.reserve_fund_start_date:
        should_collect = selected_date >= building.reserve_fund_start_date
        print(f"📊 Should collect reserve fund in {test_month}? {should_collect}")
        print(f"   Selected date: {selected_date}")
        print(f"   Start date: {building.reserve_fund_start_date}")
        print(f"   Comparison: {selected_date} >= {building.reserve_fund_start_date} = {should_collect}")
    else:
        print("❌ No reserve fund start date set!")
    
    print()
    
    # Calculate what the monthly contribution should be
    if building.reserve_fund_goal and building.reserve_fund_duration_months:
        monthly_contribution = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
        print(f"💰 Monthly contribution: {monthly_contribution:.2f}€")
        print(f"   Calculation: {building.reserve_fund_goal}€ ÷ {building.reserve_fund_duration_months} months")
        
        # Add management fees
        management_fees = 10 * float(building.management_fee_per_apartment or 0)
        total_monthly = monthly_contribution + management_fees
        print(f"💼 Management fees: {management_fees}€")
        print(f"🧮 Total (reserve + management): {total_monthly:.2f}€")
        
        if abs(total_monthly - 343.33) < 0.01:
            print("✅ This matches the 343.33€ amount!")
    
    print()
    print("=== CONCLUSION ===")
    print("The 343.33€ amount is appearing because:")
    print("1. Reserve fund monthly contribution: 333.33€")
    print("2. Management fees: 10.00€") 
    print("3. Total: 343.33€")
    print()
    print("However, this should NOT appear for May 2025 since")
    print("the reserve fund collection starts in July 2025!")
