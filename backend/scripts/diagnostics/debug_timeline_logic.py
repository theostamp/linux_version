#!/usr/bin/env python3
"""
Debug script για να δούμε τη λογική του timeline
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from datetime import date, timedelta

def debug_timeline_logic():
    """Debug timeline logic"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Timeline Logic")
        print("=" * 40)
        
        building = Building.objects.get(id=1)
        
        print(f"\n📅 BUILDING TIMELINE:")
        print(f"   • Start: {building.reserve_fund_start_date}")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        
        # Calculate end date
        start_date = building.reserve_fund_start_date
        end_date = start_date + timedelta(days=30 * building.reserve_fund_duration_months)
        print(f"   • Calculated end: {end_date}")
        
        # Test different months
        test_months = [
            ('2025-03-01', 'March 2025'),
            ('2025-04-01', 'April 2025'),
            ('2025-05-01', 'May 2025'),
            ('2025-06-01', 'June 2025'),
            ('2025-07-01', 'July 2025'),
            ('2025-08-01', 'August 2025'),
            ('2025-09-01', 'September 2025'),
        ]
        
        print(f"\n🧪 TIMELINE TESTS:")
        for test_date_str, month_name in test_months:
            test_date = date.fromisoformat(test_date_str)
            
            # Old logic (date comparison)
            old_logic = start_date <= test_date < end_date
            
            # New logic (month comparison)
            target_year_month = (test_date.year, test_date.month)
            start_year_month = (start_date.year, start_date.month)
            end_year_month = (end_date.year, end_date.month)
            new_logic = start_year_month <= target_year_month < end_year_month
            
            print(f"   • {month_name}: Old={old_logic}, New={new_logic}")
            print(f"     - Date: {test_date}")
            print(f"     - Target month: {target_year_month}")
            print(f"     - Start month: {start_year_month}")
            print(f"     - End month: {end_year_month}")

if __name__ == "__main__":
    debug_timeline_logic()
