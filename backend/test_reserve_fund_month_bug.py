#!/usr/bin/env python3
"""
Test script to reproduce the reserve fund month bug
September is being saved as August
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

def test_reserve_fund_month_bug():
    """Test the reserve fund month bug"""
    
    with schema_context('demo'):
        building = Building.objects.first()
        
        print("🔍 TESTING RESERVE FUND MONTH BUG")
        print("=" * 50)
        
        print(f"🏢 Building: {building.name}")
        print()
        
        print("📊 CURRENT SETTINGS:")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print()
        
        # Test the frontend calculation logic
        print("🧪 TESTING FRONTEND CALCULATION LOGIC:")
        print("-" * 30)
        
        # Simulate frontend values
        startMonth = "09"  # September
        startYear = "2025"
        durationMonths = 3
        
        print(f"Frontend values:")
        print(f"   • startMonth: {startMonth}")
        print(f"   • startYear: {startYear}")
        print(f"   • durationMonths: {durationMonths}")
        print()
        
        # Simulate calculateNewDates function
        year = int(startYear)
        month = int(startMonth)
        
        print(f"Parsed values:")
        print(f"   • year: {year}")
        print(f"   • month: {month}")
        print()
        
        # Create start date (JavaScript Date constructor logic)
        startDate = date(year, month, 1)  # Python date constructor
        print(f"Python date(year={year}, month={month}, day=1): {startDate}")
        
        # Simulate JavaScript Date constructor (months are 0-indexed)
        js_month = month - 1  # Convert to 0-indexed
        js_startDate = date(year, js_month + 1, 1)  # Convert back to 1-indexed for Python
        print(f"JavaScript Date(year={year}, month={js_month}, day=1): {js_startDate}")
        
        # Calculate end date
        from dateutil.relativedelta import relativedelta
        endDate = startDate + relativedelta(months=durationMonths) - relativedelta(days=1)
        print(f"End date: {endDate}")
        print()
        
        # Test what happens when we save this
        print("💾 TESTING SAVE OPERATION:")
        print("-" * 25)
        
        # Save the new values
        building.reserve_fund_start_date = startDate
        building.reserve_fund_target_date = endDate
        building.reserve_fund_goal = 3000
        building.reserve_fund_duration_months = durationMonths
        building.save()
        
        print("✅ Saved to database")
        print()
        
        # Reload and check
        building.refresh_from_db()
        
        print("📊 VERIFIED SAVED VALUES:")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print()
        
        # Check if the month is correct
        if building.reserve_fund_start_date:
            saved_month = building.reserve_fund_start_date.month
            expected_month = 9  # September
            
            print("🔍 MONTH VERIFICATION:")
            print(f"   • Expected month: {expected_month} (September)")
            print(f"   • Saved month: {saved_month}")
            
            if saved_month == expected_month:
                print("   ✅ Month is correct!")
            else:
                print("   ❌ Month is incorrect!")
                print(f"   • Difference: {saved_month - expected_month}")
        else:
            print("   ❌ No start date saved!")

if __name__ == "__main__":
    test_reserve_fund_month_bug()
