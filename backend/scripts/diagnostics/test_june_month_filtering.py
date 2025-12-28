#!/usr/bin/env python3
"""
Test script to verify that month filtering works correctly in the calculate_advanced API
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

def test_month_filtering():
    """Test that month filtering works correctly by directly calling the calculator"""
    
    with schema_context('demo'):
        print("🔍 Testing month filtering in AdvancedCommonExpenseCalculator...")
        
        # Test 1: June 2025 with month filtering (should show only management fees = 10€)
        print("\n📅 Test 1: June 2025 with proper month filtering")
        calculator_june = AdvancedCommonExpenseCalculator(
            building_id=1,  # Αλκμάνος 22
            period_start_date='2025-06-01',
            period_end_date='2025-06-30',
            reserve_fund_monthly_total=100
        )
        
        try:
            result_june = calculator_june.calculate_advanced_shares()
            total_june = result_june.get('total_amount', 0)
            management_fees_june = result_june.get('management_fees', 0)
            
            print(f"💰 June 2025 Total: {total_june}€")
            print(f"🏢 June 2025 Management fees: {management_fees_june}€")
            
            if float(total_june) <= 15:  # Allow small margin
                print("✅ SUCCESS: June filtering working! Only management fees included.")
            else:
                print("❌ FAILURE: June filtering broken! Includes future expenses.")
                
        except Exception as e:
            print(f"❌ June test failed: {e}")
        
        # Test 2: No month filtering (should include ALL expenses including August)
        print("\n📅 Test 2: No month filtering (should include all expenses)")
        calculator_all = AdvancedCommonExpenseCalculator(
            building_id=1,  # Αλκμάνος 22
            # No period dates = include all expenses
            reserve_fund_monthly_total=100
        )
        
        try:
            result_all = calculator_all.calculate_advanced_shares()
            total_all = result_all.get('total_amount', 0)
            management_fees_all = result_all.get('management_fees', 0)
            
            print(f"💰 All expenses Total: {total_all}€")
            print(f"🏢 All expenses Management fees: {management_fees_all}€")
            
            if float(total_all) > 300:  # Should include August 300€ ΔΕΗ + management fees
                print("✅ SUCCESS: No filtering includes all expenses as expected.")
            else:
                print("❌ UNEXPECTED: All expenses total seems low.")
                
        except Exception as e:
            print(f"❌ All expenses test failed: {e}")
        
        # Test 3: August 2025 filtering (should include the 300€ ΔΕΗ expense)
        print("\n📅 Test 3: August 2025 with month filtering")
        calculator_august = AdvancedCommonExpenseCalculator(
            building_id=1,  # Αλκμάνος 22
            period_start_date='2025-08-01',
            period_end_date='2025-08-31',
            reserve_fund_monthly_total=100
        )
        
        try:
            result_august = calculator_august.calculate_advanced_shares()
            total_august = result_august.get('total_amount', 0)
            management_fees_august = result_august.get('management_fees', 0)
            
            print(f"💰 August 2025 Total: {total_august}€")
            print(f"🏢 August 2025 Management fees: {management_fees_august}€")
            
            if float(total_august) > 300:  # Should include 300€ ΔΕΗ + management fees + reserve
                print("✅ SUCCESS: August filtering includes ΔΕΗ expense.")
            else:
                print("❌ FAILURE: August filtering missing ΔΕΗ expense.")
                
        except Exception as e:
            print(f"❌ August test failed: {e}")

if __name__ == "__main__":
    test_month_filtering()
