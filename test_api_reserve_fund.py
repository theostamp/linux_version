#!/usr/bin/env python3
"""
Script to test the API response for common expenses calculation
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

def test_api_reserve_fund():
    """Test the API response for common expenses calculation"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        apartments = Apartment.objects.filter(building_id=building.id)
        
        print("🔍 API RESERVE FUND TEST")
        print("=" * 50)
        print(f"🏢 Building: {building.name}")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print()
        
        # Test with April 2024
        test_month = "2024-04"
        print(f"🧪 Testing with month: {test_month}")
        
        # Create calculator instance
        calculator = CommonExpenseCalculator(
            building_id=building.id,
            month=test_month
        )
        
        # Calculate shares
        shares = calculator.calculate_shares()
        
        print(f"\n📊 SHARES CALCULATION RESULTS:")
        print(f"   Total apartments: {len(shares)}")
        
        # Check reserve fund in shares
        total_reserve_fund = 0
        apartments_with_reserve = 0
        
        for apartment_id, share_data in shares.items():
            reserve_amount = share_data.get('reserve_fund_contribution', 0)
            total_reserve_fund += reserve_amount
            
            if reserve_amount > 0:
                apartments_with_reserve += 1
                print(f"   Apartment {apartment_id}: {reserve_amount:,.2f}€")
        
        print(f"\n💰 RESERVE FUND SUMMARY:")
        print(f"   Total reserve fund: {total_reserve_fund:,.2f}€")
        print(f"   Apartments with reserve fund: {apartments_with_reserve}")
        
        if total_reserve_fund > 0:
            print("❌ ISSUE: Reserve fund is being calculated when it shouldn't be!")
        else:
            print("✅ CORRECT: No reserve fund is being calculated")
        
        # Check breakdown data
        print(f"\n📋 BREAKDOWN DATA SAMPLE:")
        if shares:
            first_apartment_id = list(shares.keys())[0]
            first_share = shares[first_apartment_id]
            breakdown = first_share.get('breakdown', [])
            
            print(f"   Apartment {first_apartment_id} breakdown:")
            if isinstance(breakdown, list):
                for item in breakdown:
                    if isinstance(item, dict):
                        for key, value in item.items():
                            print(f"     {key}: {value}")
            else:
                print(f"     Breakdown type: {type(breakdown)}")
                print(f"     Breakdown content: {breakdown}")
        
        print()
        print("=" * 50)

if __name__ == '__main__':
    test_api_reserve_fund()
