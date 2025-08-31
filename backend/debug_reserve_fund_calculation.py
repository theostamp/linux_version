#!/usr/bin/env python3
"""
Debug script to test reserve fund calculation logic
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.services import CommonExpenseCalculator

def debug_reserve_fund_calculation():
    """Debug the reserve fund calculation logic"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        apartments = Apartment.objects.filter(building_id=building.id)
        
        print("🔍 RESERVE FUND CALCULATION DEBUG")
        print("=" * 50)
        print(f"🏢 Building: {building.name}")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Reserve fund target date: {building.reserve_fund_target_date}")
        print()
        
        # Test with April 2024
        test_month = "2024-04"
        print(f"🧪 Testing with month: {test_month}")
        
        # Create calculator instance
        calculator = CommonExpenseCalculator(
            building_id=building.id,
            month=test_month
        )
        
        print(f"📊 Calculator month: {calculator.month}")
        print(f"📊 Calculator building reserve fund start date: {calculator.building.reserve_fund_start_date}")
        print()
        
        # Test the date comparison logic
        if calculator.month:
            from datetime import date
            try:
                year, mon = map(int, calculator.month.split('-'))
                selected_month_date = date(year, mon, 1)
                
                print(f"📅 Parsed selected month date: {selected_month_date}")
                print(f"📅 Building reserve fund start date: {calculator.building.reserve_fund_start_date}")
                print(f"📅 Is selected month before start date? {selected_month_date < calculator.building.reserve_fund_start_date}")
                
                if selected_month_date < calculator.building.reserve_fund_start_date:
                    print("✅ Should return early - reserve fund should NOT be calculated")
                else:
                    print("❌ Should continue - reserve fund should be calculated")
                    
            except Exception as e:
                print(f"❌ Error parsing month: {e}")
        
        print()
        print("=" * 50)
        
        # Test the actual calculation
        print("🧮 Testing actual calculation...")
        
        # Initialize shares structure
        shares = {}
        for apartment in apartments:
            shares[apartment.id] = {
                'total_amount': Decimal('0.00'),
                'breakdown': [],
                'reserve_fund_amount': Decimal('0.00'),
                'reserve_fund_contribution': Decimal('0.00')
            }
        
        # Call the reserve fund calculation method
        calculator._calculate_reserve_fund_contribution(shares)
        
        # Check results
        total_reserve_fund = sum(share['reserve_fund_amount'] for share in shares.values())
        print(f"💰 Total reserve fund calculated: {total_reserve_fund:,.2f}€")
        
        if total_reserve_fund > 0:
            print("❌ ISSUE: Reserve fund was calculated when it shouldn't be!")
        else:
            print("✅ CORRECT: No reserve fund was calculated")
        
        print()
        print("=" * 50)

if __name__ == '__main__':
    debug_reserve_fund_calculation()
