#!/usr/bin/env python3
"""
Debug script για να δούμε τι συμβαίνει με το period_end_date
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import AdvancedCommonExpenseCalculator
from buildings.models import Building

def debug_period_end_date():
    """Debug period_end_date"""
    
    with schema_context('demo'):
        print("🔍 DEBUG: Period End Date")
        print("=" * 40)
        
        building = Building.objects.get(id=1)
        
        print(f"\n🏢 BUILDING DATA:")
        print(f"   • reserve_fund_goal: {building.reserve_fund_goal}")
        print(f"   • reserve_fund_duration_months: {building.reserve_fund_duration_months}")
        print(f"   • reserve_fund_priority: {building.reserve_fund_priority}")
        
        # Test calculator for March 2025
        print(f"\n🧮 CALCULATOR TEST FOR MARCH 2025:")
        calculator = AdvancedCommonExpenseCalculator(building_id=1)
        calculator.month = '2025-03'
        
        print(f"   • period_end_date: {calculator.period_end_date}")
        print(f"   • month: {calculator.month}")
        
        # Check if period_end_date is None
        if calculator.period_end_date is None:
            print(f"   • ⚠️  period_end_date is None - this will cause issues in _get_historical_balance")
        else:
            print(f"   • ✅ period_end_date is set: {calculator.period_end_date}")
        
        # Check reserve fund contribution calculation
        shares = calculator.calculate_advanced_shares()
        print(f"   • Shares calculated successfully")
        
        # Check if any apartment has reserve fund contribution
        total_reserve_fund = 0
        for apt_id, share in shares.items():
            if isinstance(share, dict) and 'reserve_fund_amount' in share:
                total_reserve_fund += share['reserve_fund_amount']
        
        print(f"   • Total reserve fund from shares: €{total_reserve_fund}")

if __name__ == "__main__":
    debug_period_end_date()
