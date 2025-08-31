#!/usr/bin/env python3
"""
Script to fix the hardcoded reserve fund contribution default value
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

def fix_reserve_fund_default():
    """Fix the hardcoded reserve fund contribution default value"""
    
    with schema_context('demo'):
        buildings = Building.objects.all()
        
        print("🔧 FIXING RESERVE FUND DEFAULT VALUES")
        print("=" * 50)
        
        for building in buildings:
            print(f"\n🏢 Building: {building.name}")
            print(f"📍 Address: {building.address}")
            
            # Check current reserve fund contribution
            current_contribution = building.reserve_contribution_per_apartment or 0
            print(f"💰 Current reserve contribution per apartment: {current_contribution}€")
            
            # If it's the hardcoded 5.00€ value, set it to 0
            if current_contribution == Decimal('5.00'):
                print(f"⚠️  Found hardcoded 5.00€ value - fixing...")
                building.reserve_contribution_per_apartment = Decimal('0.00')
                building.save()
                print(f"✅ Fixed: Set to 0.00€")
            else:
                print(f"✅ Already correct: {current_contribution}€")
        
        print(f"\n" + "=" * 50)
        print("✅ RESERVE FUND DEFAULT VALUES FIXED")
        print("=" * 50)

if __name__ == '__main__':
    fix_reserve_fund_default()
