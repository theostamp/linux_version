#!/usr/bin/env python3
"""
Investigate Calculation Discrepancy
Analyzes the difference between basic and advanced calculations
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
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from django.db.models import Sum

def investigate_calculation_discrepancy(building_id):
    """Investigate the difference between basic and advanced calculations"""
    print("🔍 INVESTIGATING CALCULATION DISCREPANCY")
    print("=" * 60)
    
    with schema_context('demo'):
        building = Building.objects.get(id=building_id)
        
        print(f"🏢 Building: {building.name}")
        print(f"💰 Reserve Fund Goal: €{building.reserve_fund_goal or 0:,.2f}")
        print(f"⏱️ Reserve Fund Duration: {building.reserve_fund_duration_months or 0} months")
        print(f"💵 Reserve Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")
        print(f"🏛️ Management Fee per Apartment: €{building.management_fee_per_apartment or 0:,.2f}")
        
        # Get unissued expenses
        expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"\n💸 Unissued Expenses Total: €{total_expenses:,.2f}")
        
        # Test basic calculation
        print("\n🧮 BASIC CALCULATION:")
        print("-" * 30)
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=False)
        
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        print(f"Total (without reserve fund): €{basic_total:,.2f}")
        
        # Test basic calculation with reserve fund
        basic_shares_with_reserve = basic_calculator.calculate_shares(include_reserve_fund=True)
        basic_total_with_reserve = sum(share['total_amount'] for share in basic_shares_with_reserve.values())
        print(f"Total (with reserve fund): €{basic_total_with_reserve:,.2f}")
        
        # Test advanced calculation
        print("\n🧮 ADVANCED CALCULATION:")
        print("-" * 30)
        
        # Calculate monthly reserve fund amount
        monthly_reserve = 0
        if building.reserve_contribution_per_apartment:
            apartments_count = Apartment.objects.filter(building_id=building_id).count()
            monthly_reserve = float(building.reserve_contribution_per_apartment) * apartments_count
            print(f"Monthly Reserve Fund Target: €{monthly_reserve:,.2f} ({building.reserve_contribution_per_apartment} × {apartments_count} apartments)")
        
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=monthly_reserve
        )
        advanced_shares = advanced_calculator.calculate_advanced_shares()
        
        advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
        print(f"Advanced Total: €{advanced_total:,.2f}")
        
        # Analyze the difference
        print("\n📊 DISCREPANCY ANALYSIS:")
        print("-" * 30)
        
        difference_basic_advanced = abs(basic_total - advanced_total)
        difference_basic_with_reserve = abs(basic_total_with_reserve - advanced_total)
        
        print(f"Basic vs Advanced difference: €{difference_basic_advanced:,.2f}")
        print(f"Basic (with reserve) vs Advanced difference: €{difference_basic_with_reserve:,.2f}")
        
        if difference_basic_with_reserve < Decimal('0.01'):
            print("✅ The difference is due to reserve fund inclusion")
        else:
            print("⚠️ There's still a discrepancy beyond reserve fund")
        
        # Check reserve fund contribution in advanced calculation
        reserve_contribution = advanced_shares.get('reserve_contribution', 0)
        print(f"Reserve Contribution in Advanced: €{reserve_contribution:,.2f}")
        
        # Show apartment breakdown comparison
        print("\n📋 APARTMENT BREAKDOWN COMPARISON:")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        for apt in apartments:
            basic_share = basic_shares.get(apt.id, {})
            basic_share_with_reserve = basic_shares_with_reserve.get(apt.id, {})
            advanced_share = advanced_shares['shares'].get(apt.id, {})
            
            print(f"Apartment {apt.number} ({apt.participation_mills} mills):")
            print(f"  Basic (no reserve): €{basic_share.get('total_amount', 0):,.2f}")
            print(f"  Basic (with reserve): €{basic_share_with_reserve.get('total_amount', 0):,.2f}")
            print(f"  Advanced: €{advanced_share.get('total_amount', 0):,.2f}")
            
            basic_reserve = basic_share_with_reserve.get('reserve_fund_amount', 0)
            advanced_reserve = advanced_share.get('breakdown', {}).get('reserve_fund_contribution', 0)
            
            if basic_reserve > 0 or advanced_reserve > 0:
                print(f"  Reserve Fund - Basic: €{basic_reserve:,.2f}, Advanced: €{advanced_reserve:,.2f}")
            print()

def analyze_reserve_fund_logic(building_id):
    """Analyze the reserve fund calculation logic"""
    print("\n🏦 RESERVE FUND LOGIC ANALYSIS")
    print("=" * 60)
    
    with schema_context('demo'):
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("Reserve Fund Configuration:")
        print(f"  Goal: €{building.reserve_fund_goal or 0:,.2f}")
        print(f"  Duration: {building.reserve_fund_duration_months or 0} months")
        print(f"  Contribution per Apartment: €{building.reserve_contribution_per_apartment or 0:,.2f}")
        print(f"  Start Date: {building.reserve_fund_start_date}")
        
        # Check if reserve fund should be collected
        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
        print(f"\nCurrent Obligations: €{total_obligations:,.2f}")
        
        if total_obligations > 0:
            print("⚠️ Reserve fund collection should be paused due to outstanding obligations")
        else:
            print("✅ Reserve fund collection can proceed")
        
        # Calculate expected monthly reserve
        if building.reserve_contribution_per_apartment:
            expected_monthly = float(building.reserve_contribution_per_apartment) * len(apartments)
            print(f"Expected Monthly Reserve: €{expected_monthly:,.2f}")
        
        # Check actual reserve fund payments
        reserve_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            payment_type='reserve_fund'
        )
        total_reserve_collected = reserve_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"Actual Reserve Collected: €{total_reserve_collected:,.2f}")

def main():
    """Main investigation function"""
    building_id = 4  # Alkmanos 22
    
    print("🔍 CALCULATION DISCREPANCY INVESTIGATION")
    print("=" * 80)
    
    try:
        investigate_calculation_discrepancy(building_id)
        analyze_reserve_fund_logic(building_id)
        
        print("\n" + "=" * 80)
        print("✅ INVESTIGATION COMPLETED")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Investigation failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
