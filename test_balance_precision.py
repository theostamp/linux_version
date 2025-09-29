#!/usr/bin/env python3
"""
Test script to verify decimal precision fixes in balance calculations
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
from apartments.models import Apartment
from financial.services import FinancialDashboardService

def test_precision_fixes():
    """Test the precision fixes for balance calculations"""
    
    with schema_context('demo'):
        print("🔍 Testing Decimal Precision Fixes...")
        
        # Get apartments
        apartments = Apartment.objects.all()[:5]
        
        for apartment in apartments:
            print(f"\n📋 Testing Apartment {apartment.number} ({apartment.owner_name})")
            
            # Test FinancialDashboardService balance calculation
            financial_service = FinancialDashboardService(building_id=apartment.building_id)
            
            try:
                balance_data = financial_service.get_apartment_financial_data(
                    apartment_id=apartment.id
                )
                
                total_balance = balance_data.get('total_balance', 0)
                current_obligations = balance_data.get('current_obligations', 0)  
                previous_obligations = balance_data.get('previous_obligations', 0)
                
                print(f"  💰 Total Balance: €{total_balance:.2f}")
                print(f"  📊 Current Obligations: €{current_obligations:.2f}")
                print(f"  📈 Previous Obligations: €{previous_obligations:.2f}")
                
                # Check for precision issues
                total_balance_decimal = Decimal(str(total_balance))
                if total_balance_decimal != total_balance_decimal.quantize(Decimal('0.01')):
                    print(f"  ❌ PRECISION ISSUE: {total_balance} has more than 2 decimal places")
                else:
                    print(f"  ✅ PRECISION OK: {total_balance} is properly rounded")
                    
                # Check for tiny values that should be zero
                if abs(total_balance) < 0.01 and total_balance != 0:
                    print(f"  ⚠️  MICRO BALANCE: {total_balance} should probably be 0.00")
                
            except Exception as e:
                print(f"  ❌ ERROR calculating balance: {str(e)}")
                
        print(f"\n🔬 Testing Division Precision...")
        
        # Test specific precision calculations that were problematic
        test_amount = Decimal('200.00')
        test_mills = [100, 150, 200, 250, 300]  # Should sum to 1000
        total_mills = sum(test_mills)
        
        calculated_shares = []
        for mills in test_mills:
            share = (test_amount * Decimal(str(mills)) / Decimal(str(total_mills))).quantize(Decimal('0.01'))
            calculated_shares.append(share)
            print(f"  🔢 {mills}/1000 mills of €200.00 = €{share}")
        
        total_calculated = sum(calculated_shares)
        difference = test_amount - total_calculated
        
        print(f"  📊 Original Amount: €{test_amount}")
        print(f"  📊 Sum of Shares: €{total_calculated}")
        print(f"  📊 Difference: €{difference}")
        
        if difference == Decimal('0.00'):
            print("  ✅ PERFECT: No rounding errors in division!")
        else:
            print(f"  ⚠️  ROUNDING DIFF: €{difference} difference due to rounding")
        
        print(f"\n✨ Precision test completed!")

if __name__ == "__main__":
    test_precision_fixes()