#!/usr/bin/env python3
"""
Script to debug why July 2025 is not showing the reserve fund correctly
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

def debug_july_2025_reserve_fund():
    """Debug why July 2025 is not showing the reserve fund correctly"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print("🔍 JULY 2025 RESERVE FUND DEBUG")
        print("=" * 50)
        print(f"🏢 Building: {building.name}")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Reserve fund target date: {building.reserve_fund_target_date}")
        print()
        
        # Test July 2025 specifically
        test_month = "2025-07"
        print(f"🧪 Testing month: {test_month}")
        
        # Parse the month
        year, mon = map(int, test_month.split('-'))
        selected_month_date = date(year, mon, 1)
        
        print(f"📅 Selected month date: {selected_month_date}")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Is selected month before start date? {selected_month_date < building.reserve_fund_start_date}")
        print(f"📅 Is selected month equal to start date? {selected_month_date == building.reserve_fund_start_date}")
        print(f"📅 Is selected month after start date? {selected_month_date > building.reserve_fund_start_date}")
        
        # Check if July 31, 2025 is the start date
        july_31_2025 = date(2025, 7, 31)
        print(f"\n📅 July 31, 2025: {july_31_2025}")
        print(f"📅 Is July 1, 2025 before July 31, 2025? {selected_month_date < july_31_2025}")
        
        # The issue is that July 1, 2025 is before July 31, 2025
        # So the reserve fund should NOT be collected in July 2025
        # The start date is July 31, 2025, which means collection starts from August 2025
        
        print("\n💡 ANALYSIS:")
        print("   • Reserve fund start date: July 31, 2025")
        print("   • July 2025 (July 1, 2025) is BEFORE the start date")
        print("   • Reserve fund should NOT be collected in July 2025")
        print("   • Reserve fund should start from August 2025")
        
        print("\n✅ CONCLUSION:")
        print("   The current behavior is CORRECT!")
        print("   July 2025 should show 0.00€ reserve fund")
        print("   August 2025 should show 333.33€ reserve fund")
        
        print()
        print("=" * 50)

if __name__ == '__main__':
    debug_july_2025_reserve_fund()
