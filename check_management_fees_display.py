#!/usr/bin/env python3
"""
Check why management fees are not displaying correctly
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
from financial.services import AdvancedCommonExpenseCalculator
from apartments.models import Apartment

def main():
    with schema_context('demo'):
        building_id = 1
        
        print("🔍 MANAGEMENT FEES DEBUG")
        print("=" * 40)
        
        calc = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=Decimal('100')
        )
        
        result = calc.calculate_advanced_shares()
        shares = result.get('shares', {})
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print(f"Total apartments: {apartments.count()}")
        print(f"Total shares returned: {len(shares)}")
        
        management_fees = []
        reserve_contributions = []
        
        for apt in apartments:
            apt_id = str(apt.id)
            print(f"\nApartment {apt.number} (ID: {apt.id}):")
            
            if apt_id in shares:
                share = shares[apt_id]
                breakdown = share.get('breakdown', {})
                
                mgmt_fee = breakdown.get('management_fee', 'NOT_FOUND')
                reserve_contrib = breakdown.get('reserve_fund_contribution', 'NOT_FOUND')
                
                print(f"  Management fee: {mgmt_fee}")
                print(f"  Reserve contribution: {reserve_contrib}")
                print(f"  Breakdown keys: {list(breakdown.keys())}")
                
                if mgmt_fee != 'NOT_FOUND':
                    management_fees.append(float(mgmt_fee))
                if reserve_contrib != 'NOT_FOUND':
                    reserve_contributions.append(float(reserve_contrib))
            else:
                print(f"  ❌ No share data found for apartment ID {apt.id}")
        
        print(f"\n📊 SUMMARY:")
        print(f"Management fees collected: {management_fees}")
        print(f"Reserve contributions collected: {reserve_contributions}")
        
        # Check if management fees are equal
        if management_fees:
            unique_fees = set(management_fees)
            if len(unique_fees) == 1:
                print(f"✅ Management fees are EQUAL: {management_fees[0]:.2f}€ per apartment")
            else:
                print(f"❌ Management fees vary: {unique_fees}")
        else:
            print(f"⚠️ No management fees found")
        
        # Check reserve fund distribution
        if reserve_contributions and len(reserve_contributions) == apartments.count():
            print(f"\n🔍 Reserve Fund Check:")
            all_correct = True
            for i, apt in enumerate(apartments):
                actual = reserve_contributions[i]
                expected = (apt.participation_mills / 1000) * 100
                diff = abs(actual - expected)
                
                status = "✅" if diff < 0.01 else "❌"
                print(f"  {status} {apt.number}: {actual:.2f}€ (expected: {expected:.2f}€)")
                
                if diff >= 0.01:
                    all_correct = False
            
            if all_correct:
                print(f"✅ Reserve fund correctly distributed by participation mills")

if __name__ == "__main__":
    main()
