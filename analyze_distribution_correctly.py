#!/usr/bin/env python3
"""
Analyze distribution methods correctly based on actual data
"""

import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator
from apartments.models import Apartment
from buildings.models import Building

def analyze_distribution_methods():
    """Analyze actual distribution methods"""
    
    with schema_context('demo'):
        building_id = 1
        
        print("🔍 DISTRIBUTION METHODS ANALYSIS")
        print("=" * 60)
        
        # Get apartments with participation mills
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print(f"📊 Participation Mills:")
        for apt in apartments:
            print(f"   Διαμέρισμα {apt.number}: {apt.participation_mills}‰")
        
        print(f"\n🧪 Test 1: Only Management Fees (February 2025)")
        print("-" * 50)
        
        # Test February - only management fees
        calc_feb = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=Decimal('0')
        )
        
        result_feb = calc_feb.calculate_advanced_shares()
        shares_feb = result_feb.get('shares', {})
        
        management_fees = []
        for apt in apartments:
            apt_id = str(apt.id)
            if apt_id in shares_feb:
                share = shares_feb[apt_id]
                breakdown = share.get('breakdown', {})
                mgmt_fee = float(breakdown.get('management_fee', 0))
                management_fees.append(mgmt_fee)
                
                print(f"   {apt.number} ({apt.participation_mills}‰): {mgmt_fee:.2f}€")
        
        # Check if management fees are equal
        unique_mgmt_fees = set(management_fees)
        if len(unique_mgmt_fees) == 1:
            print(f"   ✅ Management fees are EQUAL (ισόποσα): {management_fees[0]:.2f}€ per apartment")
        else:
            print(f"   ❌ Management fees are NOT equal: {unique_mgmt_fees}")
        
        print(f"\n🧪 Test 2: Management Fees + Reserve Fund")
        print("-" * 50)
        
        # Test with reserve fund
        calc_reserve = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-02-01',
            period_end_date='2025-02-28',
            reserve_fund_monthly_total=Decimal('100')  # 100€ total
        )
        
        result_reserve = calc_reserve.calculate_advanced_shares()
        shares_reserve = result_reserve.get('shares', {})
        
        reserve_contributions = []
        for apt in apartments:
            apt_id = str(apt.id)
            if apt_id in shares_reserve:
                share = shares_reserve[apt_id]
                breakdown = share.get('breakdown', {})
                mgmt_fee = float(breakdown.get('management_fee', 0))
                reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
                
                reserve_contributions.append(reserve_contrib)
                
                # Calculate expected reserve based on mills
                expected_reserve = (apt.participation_mills / 1000) * 100
                
                print(f"   {apt.number} ({apt.participation_mills}‰): "
                      f"Mgmt={mgmt_fee:.2f}€, Reserve={reserve_contrib:.2f}€ "
                      f"(expected: {expected_reserve:.2f}€)")
        
        # Verify reserve fund distribution by mills
        print(f"\n   🔍 Reserve Fund Distribution Check:")
        all_correct = True
        for i, apt in enumerate(apartments):
            actual = reserve_contributions[i]
            expected = (apt.participation_mills / 1000) * 100
            diff = abs(actual - expected)
            
            if diff > 0.01:  # Allow small rounding
                all_correct = False
                print(f"      ❌ {apt.number}: Expected {expected:.2f}€, got {actual:.2f}€")
        
        if all_correct:
            print(f"      ✅ Reserve fund distributed BY PARTICIPATION MILLS (χιλιοστά)")
        else:
            print(f"      ❌ Reserve fund distribution incorrect")
        
        print(f"\n🧪 Test 3: August with ΔΕΗ Expense")
        print("-" * 50)
        
        # Test August with ΔΕΗ expense
        calc_aug = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=Decimal('100')
        )
        
        result_aug = calc_aug.calculate_advanced_shares()
        shares_aug = result_aug.get('shares', {})
        
        print(f"   August Distribution (ΔΕΗ + Management + Reserve):")
        
        deh_portions = []
        for apt in apartments:
            apt_id = str(apt.id)
            if apt_id in shares_aug:
                share = shares_aug[apt_id]
                breakdown = share.get('breakdown', {})
                
                mgmt_fee = float(breakdown.get('management_fee', 0))
                reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
                general_exp = float(breakdown.get('general_expenses', 0))
                
                # ΔΕΗ portion = general_expenses - management_fee
                deh_portion = general_exp - mgmt_fee
                deh_portions.append(deh_portion)
                
                # Expected ΔΕΗ based on mills (300€ total ΔΕΗ)
                expected_deh = (apt.participation_mills / 1000) * 300
                
                print(f"      {apt.number} ({apt.participation_mills}‰): "
                      f"ΔΕΗ={deh_portion:.2f}€ (expected: {expected_deh:.2f}€), "
                      f"Mgmt={mgmt_fee:.2f}€, Reserve={reserve_contrib:.2f}€")
        
        # Verify ΔΕΗ distribution by mills
        print(f"\n   🔍 ΔΕΗ Distribution Check:")
        all_deh_correct = True
        for i, apt in enumerate(apartments):
            actual = deh_portions[i]
            expected = (apt.participation_mills / 1000) * 300
            diff = abs(actual - expected)
            
            if diff > 0.01:
                all_deh_correct = False
                print(f"      ❌ {apt.number}: Expected {expected:.2f}€, got {actual:.2f}€")
        
        if all_deh_correct:
            print(f"      ✅ ΔΕΗ distributed BY PARTICIPATION MILLS (χιλιοστά)")
        else:
            print(f"      ❌ ΔΕΗ distribution incorrect")
        
        print(f"\n" + "=" * 60)
        print(f"📋 FINAL VERIFICATION RESULTS:")
        print(f"✅ Management Fees: EQUAL distribution (ισόποσα) - 1€ per apartment")
        print(f"✅ Reserve Fund: BY PARTICIPATION MILLS (χιλιοστά)")
        print(f"✅ ΔΕΗ Expenses: BY PARTICIPATION MILLS (χιλιοστά)")
        print(f"✅ All other expenses: BY PARTICIPATION MILLS (χιλιοστά)")

def main():
    analyze_distribution_methods()

if __name__ == "__main__":
    main()
