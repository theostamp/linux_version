#!/usr/bin/env python3
"""
Test script to verify distribution methods:
- Management fees: Equal distribution (ισόποσα)
- All other expenses (including reserve fund): By participation mills (χιλιοστά)
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
from buildings.models import Building

def analyze_participation_mills():
    """Analyze participation mills distribution for apartments"""
    
    with schema_context('demo'):
        building_id = 1  # Αλκμάνος 22
        
        print("🏢 Participation Mills Analysis")
        print("=" * 50)
        
        try:
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
            
            print(f"Building: {building.name}")
            print(f"Total apartments: {apartments.count()}")
            
            total_mills = 0
            print("\n📊 Apartment Participation Mills:")
            
            for apt in apartments:
                mills = apt.participation_mills or 0
                total_mills += mills
                print(f"   {apt.number}: {mills} χιλιοστά")
            
            print(f"\n✅ Total participation mills: {total_mills}")
            
            if total_mills == 1000:
                print("✅ CORRECT: Total mills = 1000 (100%)")
            else:
                print(f"⚠️ WARNING: Total mills = {total_mills} (should be 1000)")
            
            return apartments
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return []

def test_distribution_methods():
    """Test distribution methods for different expense types"""
    
    with schema_context('demo'):
        building_id = 1
        month = "2025-02"  # Test with February (no ΔΕΗ, only management fees)
        
        print(f"\n🧪 Testing Distribution Methods for {month}")
        print("=" * 60)
        
        apartments = analyze_participation_mills()
        if not apartments:
            return
        
        # Test with advanced calculator
        from datetime import date, timedelta
        year, month_num = month.split('-')
        year, month_num = int(year), int(month_num)
        
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num + 1, 1) - timedelta(days=1)
        
        period_start = start_date.strftime('%Y-%m-%d')
        period_end = end_date.strftime('%Y-%m-%d')
        
        # Test scenarios with different reserve fund amounts
        test_scenarios = [
            {
                'name': 'No Reserve Fund',
                'reserve_amount': 0,
                'description': 'Only management fees (should be equal distribution)'
            },
            {
                'name': 'With Reserve Fund',
                'reserve_amount': 100,  # 100€ total for building
                'description': 'Management fees (equal) + Reserve fund (by mills)'
            }
        ]
        
        for scenario in test_scenarios:
            print(f"\n🔬 Scenario: {scenario['name']}")
            print(f"   {scenario['description']}")
            print("-" * 40)
            
            try:
                calculator = AdvancedCommonExpenseCalculator(
                    building_id=building_id,
                    period_start_date=period_start,
                    period_end_date=period_end,
                    reserve_fund_monthly_total=Decimal(str(scenario['reserve_amount']))
                )
                
                result = calculator.calculate_advanced_shares()
                shares = result.get('shares', {})
                
                if not shares:
                    print("   ❌ No shares calculated")
                    continue
                
                print("   📋 Distribution Analysis:")
                
                # Analyze management fee distribution
                management_fees = []
                reserve_contributions = []
                general_expenses = []
                total_amounts = []
                
                # Get apartment data in correct order
                apt_data = []
                for apt in apartments:
                    apt_id = str(apt.id)
                    if apt_id in shares:
                        share = shares[apt_id]
                        breakdown = share.get('breakdown', {})
                        
                        mgmt_fee = float(breakdown.get('management_fee', 0))
                        reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
                        general_exp = float(breakdown.get('general_expenses', 0))
                        total_amt = float(share.get('total_amount', 0))
                        
                        apt_data.append({
                            'apt': apt,
                            'mgmt_fee': mgmt_fee,
                            'reserve_contrib': reserve_contrib,
                            'general_exp': general_exp,
                            'total_amt': total_amt
                        })
                        
                        print(f"      {apt.number} ({apt.participation_mills}‰): "
                              f"Mgmt={mgmt_fee:.2f}€, Reserve={reserve_contrib:.2f}€, "
                              f"General={general_exp:.2f}€, Total={total_amt:.2f}€")
                
                # Extract values for analysis
                management_fees = [data['mgmt_fee'] for data in apt_data]
                reserve_contributions = [data['reserve_contrib'] for data in apt_data]
                general_expenses = [data['general_exp'] for data in apt_data]
                total_amounts = [data['total_amt'] for data in apt_data]
                
                # Check if management fees are equal (ισόποσα)
                print("\n   🔍 Management Fees Distribution Check:")
                if management_fees and len(set(management_fees)) <= 1:  # All values are the same
                    print("      ✅ CORRECT: Management fees are equal (ισόποσα)")
                    print(f"      ✅ Each apartment pays: {management_fees[0]:.2f}€")
                elif management_fees:
                    print("      ❌ ERROR: Management fees are not equal!")
                    print(f"      ❌ Values: {management_fees}")
                else:
                    print("      ⚠️ No management fees data found")
                
                # Check if reserve fund follows participation mills
                if scenario['reserve_amount'] > 0:
                    print("\n   🔍 Reserve Fund Distribution Check:")
                    
                    # Calculate expected reserve contributions based on mills
                    total_reserve = sum(reserve_contributions)
                    expected_contributions = []
                    
                    for apt in apartments:
                        apt_mills = apt.participation_mills or 0
                        expected_contrib = (apt_mills / 1000) * scenario['reserve_amount']
                        expected_contributions.append(expected_contrib)
                    
                    # Compare actual vs expected
                    all_correct = True
                    for i, apt in enumerate(apartments):
                        actual = reserve_contributions[i]
                        expected = expected_contributions[i]
                        diff = abs(actual - expected)
                        
                        if diff > 0.01:  # Allow small rounding differences
                            all_correct = False
                            print(f"      ❌ {apt.number}: Expected {expected:.2f}€, got {actual:.2f}€")
                    
                    if all_correct:
                        print("      ✅ CORRECT: Reserve fund distributed by participation mills")
                        print(f"      ✅ Total reserve fund: {total_reserve:.2f}€")
                    else:
                        print("      ❌ ERROR: Reserve fund distribution incorrect!")
                
            except Exception as e:
                print(f"   ❌ Error in scenario: {e}")

def test_august_with_deh():
    """Test August with ΔΕΗ expense to verify expense distribution"""
    
    with schema_context('demo'):
        building_id = 1
        month = "2025-08"  # August with ΔΕΗ expense
        
        print("\n🔥 Testing August with ΔΕΗ Expense")
        print("=" * 50)
        
        from datetime import date, timedelta
        year, month_num = month.split('-')
        year, month_num = int(year), int(month_num)
        
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num + 1, 1) - timedelta(days=1)
        
        period_start = start_date.strftime('%Y-%m-%d')
        period_end = end_date.strftime('%Y-%m-%d')
        
        try:
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date=period_start,
                period_end_date=period_end,
                reserve_fund_monthly_total=Decimal('100.00')  # Include reserve fund
            )
            
            result = calculator.calculate_advanced_shares()
            shares = result.get('shares', {})
            apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
            
            print("📊 August Distribution Analysis (ΔΕΗ + Management + Reserve):")
            
            for apt in apartments:
                apt_id = str(apt.id)
                if apt_id in shares:
                    share = shares[apt_id]
                    breakdown = share.get('breakdown', {})
                    
                    mgmt_fee = float(breakdown.get('management_fee', 0))
                    reserve_contrib = float(breakdown.get('reserve_fund_contribution', 0))
                    general_exp = float(breakdown.get('general_expenses', 0))
                    total_amt = float(share.get('total_amount', 0))
                    
                    # Calculate ΔΕΗ portion (general_expenses - management_fee)
                    deh_portion = general_exp - mgmt_fee
                    
                    print(f"   {apt.number} ({apt.participation_mills}‰): "
                          f"ΔΕΗ={deh_portion:.2f}€, Mgmt={mgmt_fee:.2f}€, "
                          f"Reserve={reserve_contrib:.2f}€, Total={total_amt:.2f}€")
            
            # Verify ΔΕΗ is distributed by mills
            print("\n🔍 ΔΕΗ Distribution Verification:")
            deh_total = 300  # Known ΔΕΗ amount
            
            for apt in apartments:
                apt_id = str(apt.id)
                if apt_id in shares:
                    share = shares[apt_id]
                    breakdown = share.get('breakdown', {})
                    
                    general_exp = float(breakdown.get('general_expenses', 0))
                    mgmt_fee = float(breakdown.get('management_fee', 0))
                    deh_portion = general_exp - mgmt_fee
                    
                    expected_deh = (apt.participation_mills / 1000) * deh_total
                    diff = abs(deh_portion - expected_deh)
                    
                    if diff < 0.01:
                        status = "✅"
                    else:
                        status = "❌"
                    
                    print(f"   {status} {apt.number}: Expected {expected_deh:.2f}€, got {deh_portion:.2f}€")
            
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    """Run all distribution tests"""
    print("🧪 DISTRIBUTION METHODS VERIFICATION")
    print("=" * 70)
    print("Testing:")
    print("- Management fees: Equal distribution (ισόποσα)")
    print("- All other expenses: By participation mills (χιλιοστά)")
    print("- Reserve fund: By participation mills (χιλιοστά)")
    
    analyze_participation_mills()
    test_distribution_methods()
    test_august_with_deh()
    
    print("\n" + "=" * 70)
    print("🏁 DISTRIBUTION VERIFICATION COMPLETED!")
    print("\n📋 Expected Behavior:")
    print("✅ Management fees: Same amount for all apartments (ισόποσα)")
    print("✅ ΔΕΗ expenses: Distributed by participation mills (χιλιοστά)")
    print("✅ Reserve fund: Distributed by participation mills (χιλιοστά)")
    print("✅ All other expenses: Distributed by participation mills (χιλιοστά)")

if __name__ == "__main__":
    main()
