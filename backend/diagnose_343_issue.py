#!/usr/bin/env python3
"""
Diagnostic script to investigate why 343.33€ still appears after the fix
"""

import os
import sys
import django
from datetime import date, datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService

def diagnose_343_issue():
    print("🔍 DIAGNOSING 343.33€ ISSUE")
    print("=" * 50)
    
    with schema_context('demo'):
        # Get the building
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Building: {building.name}")
        print(f"📍 Address: {building.address}")
        print(f"🏠 Apartments: {building.apartments.count()}")
        
        # Check reserve fund settings
        print(f"\n💰 RESERVE FUND SETTINGS:")
        print(f"   Goal: {building.reserve_fund_goal}€")
        print(f"   Duration: {building.reserve_fund_duration_months} months")
        print(f"   Start Date: {building.reserve_fund_start_date}")
        print(f"   Target Date: {building.reserve_fund_target_date}")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"   Monthly Target: {monthly_target:.2f}€")
        
        # Check management fee
        print(f"   Management Fee per Apartment: {building.management_fee_per_apartment}€")
        total_management = building.apartments.count() * (building.management_fee_per_apartment or 0)
        print(f"   Total Management Fees: {total_management}€")
        
        # Calculate the 343.33 breakdown
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            reserve_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            total_343 = reserve_monthly + total_management
            print(f"\n🧮 343.33€ BREAKDOWN:")
            print(f"   Reserve Fund Monthly: {reserve_monthly:.2f}€")
            print(f"   Management Fees: {total_management:.2f}€")
            print(f"   Total: {total_343:.2f}€")
        
        # Test different months
        test_months = [
            '2025-05',  # Before reserve fund (should be 10€)
            '2025-06',  # Before reserve fund (should be 10€)
            '2025-07',  # Start month (should be 343.33€)
            '2025-08',  # During collection (should be 343.33€)
            '2025-12',  # End month (should be 343.33€)
            '2026-01',  # After collection (should be 10€)
        ]
        
        print(f"\n📅 TESTING DIFFERENT MONTHS:")
        print("-" * 60)
        
        for month in test_months:
            service = FinancialDashboardService(building.id)
            summary = service.get_summary(month=month)
            
            # Check if month is within reserve fund period
            year, mon = map(int, month.split('-'))
            selected_date = date(year, mon, 1)
            
            within_period = False
            if building.reserve_fund_start_date:
                within_period = selected_date >= building.reserve_fund_start_date
                if building.reserve_fund_target_date:
                    within_period = within_period and selected_date <= building.reserve_fund_target_date
            
            current_obligations = summary['current_obligations']
            reserve_fund = summary.get('reserve_fund_contribution', 0)
            management_cost = summary.get('total_management_cost', 0)
            
            print(f"{month}: {current_obligations:.2f}€ (Within period: {within_period})")
            print(f"   Reserve Fund: {reserve_fund:.2f}€")
            print(f"   Management: {management_cost:.2f}€")
            print(f"   Total: {reserve_fund + management_cost:.2f}€")
            
            # Check if this matches the problematic 343.33€
            if abs(current_obligations - 343.33) < 0.01:
                print(f"   🚨 FOUND 343.33€ MATCH!")
                print(f"   Expected for {month}: {'343.33€' if within_period else '10.00€'}")
                if not within_period:
                    print(f"   ❌ ERROR: Reserve fund should be 0 for this month!")
        
        # Test current obligations (no month specified)
        print(f"\n🕐 CURRENT OBLIGATIONS (NO MONTH):")
        service_current = FinancialDashboardService(building.id)
        current_summary = service_current.get_summary()
        print(f"Current obligations: {current_summary['current_obligations']:.2f}€")
        
        # Check today's date vs reserve fund period
        today = date.today()
        print(f"Today's date: {today}")
        
        current_within_period = False
        if building.reserve_fund_start_date:
            current_within_period = today >= building.reserve_fund_start_date
            if building.reserve_fund_target_date:
                current_within_period = current_within_period and today <= building.reserve_fund_target_date
        
        print(f"Today within reserve fund period: {current_within_period}")
        
        print(f"\n✅ DIAGNOSIS COMPLETE")

if __name__ == '__main__':
    diagnose_343_issue()
