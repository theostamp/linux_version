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
    from financial.services import FinancialDashboardService
    from buildings.models import Building
    
    print("=== TESTING RESERVE FUND FIX ===")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    building_id = 1  # Αλκμάνος 22
    building = Building.objects.get(id=building_id)
    
    print(f"🏢 Building: {building.name}")
    print(f"📅 Reserve Fund Start Date: {building.reserve_fund_start_date}")
    print(f"🎯 Reserve Fund Goal: {building.reserve_fund_goal}€")
    print(f"⏱️ Duration: {building.reserve_fund_duration_months} months")
    print()
    
    # Test months before, during, and after reserve fund period
    test_months = [
        "2025-05",  # Before start (should be 0)
        "2025-06",  # Before start (should be 0) 
        "2025-07",  # Start month (should include reserve fund)
        "2025-08",  # During period (should include reserve fund)
        "2025-12",  # End month (should include reserve fund)
        "2026-01",  # After end (should be 0)
    ]
    
    for month in test_months:
        print(f"📊 Testing month: {month}")
        
        # Test FinancialDashboardService
        service = FinancialDashboardService(building_id)
        summary = service.get_summary(month=month)
        
        current_obligations = summary.get('current_obligations', 0)
        reserve_contribution = summary.get('reserve_fund_contribution', 0)
        management_fees = summary.get('management_fees', 0)
        
        print(f"   Current Obligations: {current_obligations}€")
        print(f"   Reserve Contribution: {reserve_contribution}€")
        print(f"   Management Fees: {management_fees}€")
        
        # Check if month should have reserve fund
        year, mon = map(int, month.split('-'))
        selected_date = date(year, mon, 1)
        should_collect = (selected_date >= building.reserve_fund_start_date and 
                         selected_date <= building.reserve_fund_target_date)
        
        expected_reserve = 333.33 if should_collect else 0.0
        expected_total = expected_reserve + 10.0  # + management fees
        
        print(f"   Should collect reserve? {should_collect}")
        print(f"   Expected reserve: {expected_reserve}€")
        print(f"   Expected total: {expected_total}€")
        
        # Verify fix
        if should_collect:
            if abs(float(current_obligations) - expected_total) < 0.01:
                print("   ✅ CORRECT: Reserve fund included as expected")
            else:
                print(f"   ❌ ERROR: Expected {expected_total}€, got {current_obligations}€")
        else:
            if abs(float(current_obligations) - 10.0) < 0.01:  # Only management fees
                print("   ✅ CORRECT: Reserve fund excluded as expected")
            else:
                print(f"   ❌ ERROR: Expected 10.0€ (management only), got {current_obligations}€")
        
        print()
    
    print("=== SPECIFIC TEST: MAY 2025 (THE ORIGINAL ISSUE) ===")
    service = FinancialDashboardService(building_id)
    may_summary = service.get_summary(month="2025-05")
    
    may_obligations = may_summary.get('current_obligations', 0)
    print(f"May 2025 Current Obligations: {may_obligations}€")
    
    if abs(float(may_obligations) - 10.0) < 0.01:
        print("✅ SUCCESS: May 2025 now shows only 10€ (management fees)")
        print("✅ FIX CONFIRMED: 343.33€ issue resolved!")
    else:
        print(f"❌ ISSUE PERSISTS: May 2025 still shows {may_obligations}€")
        print("❌ Expected: 10.0€ (management fees only)")
    
    print()
    print("=== TEST COMPLETE ===")
