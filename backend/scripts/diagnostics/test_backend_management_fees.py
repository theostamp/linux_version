#!/usr/bin/env python3
"""
Test script για να δούμε τι επιστρέφει το backend API για το κόστος διαχείρισης
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

def test_management_fees_api():
    """Test τι επιστρέφει το FinancialDashboardService για τον Αύγουστο 2025"""
    
    print("🔍 Testing Backend API for Management Fees")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Create service instance
            service = FinancialDashboardService(building_id=1)
            
            # Test για τον Αύγουστο 2025
            august_month = "2025-08"
            print(f"\n📅 Testing month: {august_month}")
            
            # Get summary
            summary = service.get_summary(august_month)
            
            print("\n📊 API Response Summary:")
            print(f"  - total_expenses_month: {summary.get('total_expenses_month', 'NOT FOUND')}€")
            print(f"  - management_fees: {summary.get('management_fees', 'NOT FOUND')}€")
            print(f"  - reserve_fund_contribution: {summary.get('reserve_fund_contribution', 'NOT FOUND')}€")
            print(f"  - apartment_count: {summary.get('apartment_count', 'NOT FOUND')}")
            
            # Check if management_fees exists
            if 'management_fees' in summary:
                print(f"\n✅ management_fees field exists: {summary['management_fees']}€")
                
                # Calculate per apartment
                apartment_count = summary.get('apartment_count', 10)
                fee_per_apartment = summary['management_fees'] / apartment_count if apartment_count > 0 else 0
                
                print(f"  - Fee per apartment: {fee_per_apartment:.2f}€")
                print(f"  - Total management fees: {summary['management_fees']}€")
                
            else:
                print("\n❌ management_fees field NOT FOUND in API response")
                print(f"Available fields: {list(summary.keys())}")
            
            # Test και για Σεπτέμβριο
            september_month = "2025-09"
            print(f"\n📅 Testing month: {september_month}")
            
            september_summary = service.get_summary(september_month)
            
            print("\n📊 September API Response:")
            print(f"  - total_expenses_month: {september_summary.get('total_expenses_month', 'NOT FOUND')}€")
            print(f"  - management_fees: {september_summary.get('management_fees', 'NOT FOUND')}€")
            
            # Compare months
            august_expenses = summary.get('total_expenses_month', 0)
            september_expenses = september_summary.get('total_expenses_month', 0)
            
            print("\n🔄 Month Comparison:")
            print(f"  - August expenses: {august_expenses}€")
            print(f"  - September expenses: {september_expenses}€")
            print(f"  - Different: {'✅ YES' if august_expenses != september_expenses else '❌ NO'}")
            
        except Exception as e:
            print(f"❌ Error testing API: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_management_fees_api()
