#!/usr/bin/env python3
"""
Script to test payment suggestions and fix the calculation
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
from financial.services import FinancialDashboardService, AdvancedCommonExpenseCalculator

def test_payment_suggestions():
    """Test payment suggestions calculation"""
    
    with schema_context('demo'):
        # Test Αλκμάνος 22
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building not found!")
            return
        
        print(f"🔍 TESTING PAYMENT SUGGESTIONS FOR {building.name}")
        print("=" * 60)
        
        # Test with August 2025 (when reserve fund should be collected)
        test_month = "2025-08"
        print(f"📊 TESTING MONTH: {test_month}")
        print()
        
        # 1. Test FinancialDashboardService (what we want)
        print("1️⃣ FINANCIAL DASHBOARD SERVICE:")
        print("-" * 40)
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
            print(f"   • Obligations per Apartment: {obligations_per_apartment:.2f}€")
        print()
        
        # 2. Test AdvancedCommonExpenseCalculator (what we currently use)
        print("2️⃣ ADVANCED COMMON EXPENSE CALCULATOR:")
        print("-" * 40)
        
        # Create date range for August 2025
        start_date = "2025-08-01"
        end_date = "2025-08-31"
        
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building.id,
            period_start_date=start_date,
            period_end_date=end_date
        )
        
        try:
            advanced_result = advanced_calculator.calculate_advanced_shares()
            advanced_shares = advanced_result.get('shares', {})
            
            total_advanced_amount = 0
            apartment_amounts = {}
            
            for apt_id, share_data in advanced_shares.items():
                total_amount = share_data.get('total_amount', 0)
                apartment_amounts[apt_id] = total_amount
                total_advanced_amount += total_amount
            
            print(f"   • Total Advanced Amount: {total_advanced_amount:.2f}€")
            print(f"   • Apartments with data: {len(apartment_amounts)}")
            
            if apartment_amounts:
                avg_advanced_amount = total_advanced_amount / len(apartment_amounts)
                print(f"   • Average per Apartment: {avg_advanced_amount:.2f}€")
            
            # Show breakdown for first apartment
            if apartment_amounts:
                first_apt_id = list(apartment_amounts.keys())[0]
                first_apt_data = advanced_shares[first_apt_id]
                breakdown = first_apt_data.get('breakdown', {})
                
                print(f"   • First Apartment ({first_apt_id}) Breakdown:")
                print(f"     - General Expenses: {breakdown.get('general_expenses', 0):.2f}€")
                print(f"     - Elevator Expenses: {breakdown.get('elevator_expenses', 0):.2f}€")
                print(f"     - Heating Expenses: {breakdown.get('heating_expenses', 0):.2f}€")
                print(f"     - Reserve Fund: {breakdown.get('reserve_fund_contribution', 0):.2f}€")
                print(f"     - Total Amount: {first_apt_data.get('total_amount', 0):.2f}€")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
        
        # 3. Comparison and Recommendation
        print("3️⃣ COMPARISON AND RECOMMENDATION:")
        print("-" * 40)
        
        print("📋 CURRENT SITUATION:")
        print(f"   • Dashboard suggests: {obligations_per_apartment:.2f}€ per apartment")
        print(f"   • Advanced calculator suggests: {avg_advanced_amount:.2f}€ per apartment")
        
        # Convert to float for comparison
        dashboard_amount = float(obligations_per_apartment)
        advanced_amount = float(avg_advanced_amount)
        difference = abs(dashboard_amount - advanced_amount)
        print(f"   • Difference: {difference:.2f}€")
        
        print()
        print("💡 RECOMMENDATION:")
        if difference > 0.01:
            print("   ❌ The advanced calculator is NOT including management costs and reserve fund")
            print("   ✅ Should use FinancialDashboardService for payment suggestions")
            print("   🔧 Need to update AddPaymentModal.tsx to use dashboard data")
        else:
            print("   ✅ Both calculators return similar results")
        
        print()
        print("🔧 PROPOSED FIX:")
        print("   • Replace calculate_advanced call with dashboard/summary call")
        print("   • Use current_obligations / apartments_count for per-apartment amount")
        print("   • This will include: Expenses + Management + Reserve Fund")
        
        print("=" * 60)

if __name__ == "__main__":
    test_payment_suggestions()
