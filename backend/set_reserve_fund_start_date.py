#!/usr/bin/env python3
"""
Script to set reserve fund start date to August 2025
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
from dateutil.relativedelta import relativedelta

def set_reserve_fund_start_date():
    """Set reserve fund start date to August 2025"""
    
    with schema_context('demo'):
        building = Building.objects.first()
        
        print("📅 SETTING RESERVE FUND START DATE")
        print("=" * 50)
        
        print(f"🏢 Building: {building.name}")
        print()
        
        print("📊 CURRENT SETTINGS:")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        print(f"   • Goal: {building.reserve_fund_goal}€")
        print(f"   • Duration: {building.reserve_fund_duration_months} months")
        print()
        
        # Set start date to August 2025
        start_date = date(2025, 8, 1)
        
        # Calculate target date (start_date + duration_months)
        target_date = start_date + relativedelta(months=building.reserve_fund_duration_months)
        
        print("🔄 SETTING TO:")
        print(f"   • Start Date: {start_date}")
        print(f"   • Target Date: {target_date}")
        print(f"   • Collection Period: {start_date} to {target_date}")
        print()
        
        # Update the building settings
        building.reserve_fund_start_date = start_date
        building.reserve_fund_target_date = target_date
        building.save()
        
        print("✅ START DATE SET SUCCESSFULLY!")
        print()
        
        # Verify the update
        building.refresh_from_db()
        print("📊 VERIFIED NEW SETTINGS:")
        print(f"   • Start Date: {building.reserve_fund_start_date}")
        print(f"   • Target Date: {building.reserve_fund_target_date}")
        
        # Check if current date is within collection period
        current_date = date.today()
        is_within_period = building.reserve_fund_start_date <= current_date <= building.reserve_fund_target_date
        print(f"   • Current Date: {current_date}")
        print(f"   • Is current date within collection period: {is_within_period}")
        
        print("=" * 50)

if __name__ == "__main__":
    set_reserve_fund_start_date()
