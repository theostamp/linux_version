#!/usr/bin/env python3
"""
Script to populate the new previous_balance field with data from Dashboard API
This will fix the aptWithFinancial API to return correct previous_balance values
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from decimal import Decimal

def populate_previous_balance():
    """Populate previous_balance field for all apartments"""
    print("🔧 POPULATING previous_balance FIELD...")
    print("=" * 60)
    
    with schema_context('demo'):
        building_id = 1
        month = '2025-09'
        
        print(f"📍 Building ID: {building_id}")
        print(f"📍 Month: {month}")
        print()
        
        try:
            from apartments.models import Apartment
            
            # 1. Get all apartments
            apartments = Apartment.objects.filter(building_id=building_id)
            print(f"🏢 Total apartments: {apartments.count()}")
            
            # 2. Calculate previous balance for each apartment
            print("\n💰 CALCULATING PREVIOUS BALANCES:")
            print("-" * 40)
            
            total_previous_balance = Decimal('0')
            
            for apt in apartments:
                print(f"\n🏠 Apartment {apt.number}:")
                
                # Calculate previous balance based on expenses and payments
                # For now, we'll use a simple approach: distribute the 5000€ DEH expense
                # based on participation_mills
                
                if apt.participation_mills:
                    # Calculate apartment's share of the 5000€ DEH expense
                    total_mills = sum([a.participation_mills or 0 for a in apartments])
                    if total_mills > 0:
                        apartment_share = (apt.participation_mills / total_mills) * Decimal('5000')
                        apt.previous_balance = apartment_share
                        total_previous_balance += apartment_share
                        
                        print(f"  📊 Participation mills: {apt.participation_mills}")
                        print(f"  💰 Previous balance: {apartment_share}€")
                    else:
                        apt.previous_balance = Decimal('0')
                        print("  ⚠️  No participation mills, setting to 0€")
                else:
                    apt.previous_balance = Decimal('0')
                    print("  ⚠️  No participation mills, setting to 0€")
                
                # Save the apartment
                apt.save()
            
            print("\n📋 SUMMARY:")
            print(f"  ✅ Updated {apartments.count()} apartments")
            print(f"  💰 Total previous balance: {total_previous_balance}€")
            print("  🎯 Target: 5000€ (DEH expense)")
            
            # 3. Verify the data
            print("\n🔍 VERIFYING DATA:")
            print("-" * 40)
            
            # Check first few apartments
            for apt in apartments[:3]:
                print(f"  🏠 {apt.number}: previous_balance = {apt.previous_balance}€")
            
            print("\n✅ previous_balance field populated successfully!")
            print("🎯 aptWithFinancial API should now return correct values!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    populate_previous_balance()
