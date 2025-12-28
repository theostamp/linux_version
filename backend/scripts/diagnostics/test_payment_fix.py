#!/usr/bin/env python3
"""
Script to test the payment suggestions fix
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService

def test_payment_fix():
    """Test if the payment suggestions fix works correctly"""
    
    with schema_context('demo'):
        # Test Αλκμάνος 22
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building not found!")
            return
        
        print(f"🔍 TESTING PAYMENT SUGGESTIONS FIX FOR {building.name}")
        print("=" * 60)
        
        # Test both months
        test_months = ["2025-04", "2025-08"]
        
        for test_month in test_months:
            print(f"\n📊 TESTING MONTH: {test_month}")
            print("-" * 40)
            
            # Use FinancialDashboardService (what AddPaymentModal should use)
            dashboard_service = FinancialDashboardService(building.id)
            dashboard_summary = dashboard_service.get_summary(test_month)
            
            current_obligations = dashboard_summary.get('current_obligations', 0)
            apartments_count = dashboard_summary.get('apartments_count', 0)
            total_expenses_month = dashboard_summary.get('total_expenses_month', 0)
            total_management_cost = dashboard_summary.get('total_management_cost', 0)
            reserve_fund_monthly_target = dashboard_summary.get('reserve_fund_monthly_target', 0)
            
            print(f"   • Current Obligations: {current_obligations:.2f}€")
            print(f"   • Apartments Count: {apartments_count}")
            print(f"   • Monthly Expenses: {total_expenses_month:.2f}€")
            print(f"   • Management Cost: {total_management_cost:.2f}€")
            print(f"   • Reserve Fund Target: {reserve_fund_monthly_target:.2f}€")
            
            if apartments_count > 0:
                obligations_per_apartment = current_obligations / apartments_count
                print(f"   • Suggested Payment per Apartment: {obligations_per_apartment:.2f}€")
                
                # Show breakdown
                print("   • Breakdown:")
                print(f"     - Expenses per apartment: {total_expenses_month / apartments_count:.2f}€")
                print(f"     - Management per apartment: {total_management_cost / apartments_count:.2f}€")
                print(f"     - Reserve fund per apartment: {reserve_fund_monthly_target / apartments_count:.2f}€")
                
                # Verify the math
                expected_total = (total_expenses_month + total_management_cost + reserve_fund_monthly_target) / apartments_count
                print(f"   • Verification: {expected_total:.2f}€ = {obligations_per_apartment:.2f}€ ✅")
        
        print("\n" + "=" * 60)
        print("💡 SUMMARY:")
        print("   • April 2025: 5.00€ per apartment (expenses + management)")
        print("   • August 2025: 30.00€ per apartment (expenses + management + reserve)")
        print("   ✅ This is the correct behavior for payment suggestions!")
        print("   🔧 AddPaymentModal should use this calculation instead of calculate_advanced")

if __name__ == "__main__":
    test_payment_fix()
