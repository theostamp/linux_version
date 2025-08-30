#!/usr/bin/env python3
"""
Debug shares keys to understand the mismatch
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
        
        print("🔍 DEBUGGING SHARES KEYS")
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
        
        print(f"Apartment IDs from database:")
        apt_ids = []
        for apt in apartments:
            apt_ids.append(apt.id)
            print(f"  {apt.number}: ID = {apt.id}")
        
        print(f"\nShares keys from calculator:")
        share_keys = list(shares.keys())
        for key in share_keys:
            print(f"  Key: {key} (type: {type(key)})")
        
        print(f"\nMatching shares to apartments:")
        management_fees = []
        reserve_contributions = []
        
        for key in share_keys:
            share = shares[key]
            breakdown = share.get('breakdown', {})
            
            mgmt_fee = float(breakdown.get('management_fee', 0))
            reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
            
            # Get apartment info from share
            apt_number = share.get('apartment_number', 'Unknown')
            participation_mills = share.get('participation_mills', 0)
            
            management_fees.append(mgmt_fee)
            reserve_contributions.append(reserve_contrib)
            
            # Expected reserve based on mills
            expected_reserve = (participation_mills / 1000) * 100
            
            print(f"  {apt_number} ({participation_mills}‰): "
                  f"Mgmt={mgmt_fee:.2f}€, Reserve={reserve_contrib:.2f}€ "
                  f"(expected: {expected_reserve:.2f}€)")
        
        # Analyze management fees
        print(f"\n🔍 Management Fees Analysis:")
        unique_mgmt_fees = set(management_fees)
        if len(unique_mgmt_fees) == 1:
            print(f"✅ Management fees are EQUAL (ισόποσα): {management_fees[0]:.2f}€")
        else:
            print(f"❌ Management fees vary: {unique_mgmt_fees}")
        
        # Analyze reserve fund distribution
        print(f"\n🔍 Reserve Fund Distribution Analysis:")
        reserve_correct = True
        for i, key in enumerate(share_keys):
            share = shares[key]
            participation_mills = share.get('participation_mills', 0)
            
            actual = reserve_contributions[i]
            expected = (participation_mills / 1000) * 100
            diff = abs(actual - expected)
            
            if diff > 0.01:
                reserve_correct = False
                apt_number = share.get('apartment_number', 'Unknown')
                print(f"  ❌ {apt_number}: Expected {expected:.2f}€, got {actual:.2f}€")
        
        if reserve_correct:
            print(f"  ✅ Reserve fund distributed BY PARTICIPATION MILLS (χιλιοστά)")

if __name__ == "__main__":
    main()
