#!/usr/bin/env python3
"""
Check which buildings exist and their Reserve Fund configuration
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

def check_buildings():
    """Check available buildings and their Reserve Fund settings"""
    
    with schema_context('demo'):
        buildings = Building.objects.all()
        print(f"📋 Found {buildings.count()} buildings:")
        print()
        
        for building in buildings:
            print(f"🏢 Building ID: {building.id}")
            print(f"   Name: {building.name}")
            print(f"   Address: {building.address}")
            print(f"   Reserve Fund Goal: {building.reserve_fund_goal}")
            print(f"   Reserve Fund Start Date: {building.reserve_fund_start_date}")
            print(f"   Reserve Fund Target Date: {building.reserve_fund_target_date}")
            print(f"   Reserve Fund Duration: {building.reserve_fund_duration_months} months")
            print()

if __name__ == '__main__':
    check_buildings()
