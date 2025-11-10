#!/usr/bin/env python3
"""
Script to test correct distribution logic
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
from apartments.models import Apartment
from financial.services import FinancialDashboardService, AdvancedCommonExpenseCalculator

def test_correct_distribution():
    """Test correct distribution logic"""
    
    with schema_context('demo'):
        # Test Αλκμάνος 22
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building not found!")
            return
        
        print(f"🔍 TESTING CORRECT DISTRIBUTION FOR {building.name}")
        print("=" * 60)
        
        # Test August 2025 (when reserve fund is collected)
        test_month = "2025-08"
        print(f"📊 TESTING MONTH: {test_month}")
        print()
        
        # Get apartments with their participation mills
        apartments = Apartment.objects.filter(building_id=building.id)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        
        print("📋 APARTMENTS INFO:")
        print(f"   • Total Apartments: {apartments.count()}")
        print(f"   • Total Participation Mills: {total_mills}")
        print()
        
        # 1. Get dashboard data for management costs
        print("1️⃣ DASHBOARD DATA (Management Costs):")
        print("-" * 40)
        dashboard_service = FinancialDashboardService(building.id)
        dashboard_summary = dashboard_service.get_summary(test_month)
        
        total_management_cost = dashboard_summary.get('total_management_cost', 0)
        management_per_apartment = total_management_cost / apartments.count() if apartments.count() > 0 else 0
        
        print(f"   • Total Management Cost: {total_management_cost:.2f}€")
        print(f"   • Management per Apartment: {management_per_apartment:.2f}€ (ίσοποσα)")
        print()
        
        # 2. Get advanced calculator data for expenses and reserve fund
        print("2️⃣ ADVANCED CALCULATOR (Expenses + Reserve Fund):")
        print("-" * 40)
        
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
            
            print("   • Advanced Calculator Results:")
            for apt_id, share_data in advanced_shares.items():
                apartment = apartments.filter(id=apt_id).first()
                if apartment:
                    total_amount = share_data.get('total_amount', 0)
                    breakdown = share_data.get('breakdown', {})
                    general_expenses = breakdown.get('general_expenses', 0)
                    reserve_fund = breakdown.get('reserve_fund_contribution', 0)
                    
                    print(f"     - Apartment {apartment.number} ({apartment.participation_mills} χιλιοστά):")
                    print(f"       * General Expenses: {general_expenses:.2f}€ (με χιλιοστά)")
                    print(f"       * Reserve Fund: {reserve_fund:.2f}€ (με χιλιοστά)")
                    print(f"       * Total (Advanced): {total_amount:.2f}€")
                    print()
                    
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # 3. Calculate correct distribution
        print("3️⃣ CORRECT DISTRIBUTION CALCULATION:")
        print("-" * 40)
        
        print("   • Formula: Advanced Calculator + Management per Apartment")
        print("   • Advanced Calculator: Expenses + Reserve Fund (με χιλιοστά)")
        print("   • Management: Equal per apartment (ίσοποσα)")
        print()
        
        for apt in apartments:
            # Get advanced calculator result for this apartment
            apt_advanced = advanced_shares.get(str(apt.id), {})
            apt_total_advanced = apt_advanced.get('total_amount', 0)
            
            # Add management cost (equal for all)
            apt_total_correct = apt_total_advanced + management_per_apartment
            
            print(f"   • Apartment {apt.number} ({apt.participation_mills} χιλιοστά):")
            print(f"     - Advanced Calculator: {apt_total_advanced:.2f}€")
            print(f"     - Management Cost: {management_per_apartment:.2f}€")
            print(f"     - CORRECT TOTAL: {apt_total_correct:.2f}€")
            print()
        
        print("=" * 60)
        print("💡 SUMMARY:")
        print("   ✅ Expenses + Reserve Fund → με χιλιοστά ιδιοκτησίας")
        print("   ✅ Management Costs → ίσοποσα ανά διαμέρισμα")
        print("   🔧 Need to combine both calculators in AddPaymentModal")

if __name__ == "__main__":
    test_correct_distribution()
