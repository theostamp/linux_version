#!/usr/bin/env python3
"""
Script to test final correct distribution logic
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
from financial.services import FinancialDashboardService

def test_final_distribution():
    """Test final correct distribution logic"""
    
    with schema_context('demo'):
        # Test Αλκμάνος 22
        building = Building.objects.filter(id=2).first()
        
        if not building:
            print("❌ Building not found!")
            return
        
        print(f"🔍 FINAL CORRECT DISTRIBUTION FOR {building.name}")
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
        
        # Get dashboard data
        dashboard_service = FinancialDashboardService(building.id)
        dashboard_summary = dashboard_service.get_summary(test_month)
        
        total_expenses_month = dashboard_summary.get('total_expenses_month', 0)
        total_management_cost = dashboard_summary.get('total_management_cost', 0)
        reserve_fund_monthly_target = dashboard_summary.get('reserve_fund_monthly_target', 0)
        
        print("📊 DASHBOARD DATA:")
        print(f"   • Total Expenses: {total_expenses_month:.2f}€")
        print(f"   • Total Management Cost: {total_management_cost:.2f}€")
        print(f"   • Reserve Fund Target: {reserve_fund_monthly_target:.2f}€")
        print()
        
        # Calculate distribution
        print("🔧 CORRECT DISTRIBUTION CALCULATION:")
        print("-" * 40)
        
        management_per_apartment = total_management_cost / apartments.count() if apartments.count() > 0 else 0
        reserve_per_apartment = reserve_fund_monthly_target / apartments.count() if apartments.count() > 0 else 0
        
        print(f"   • Management per Apartment: {management_per_apartment:.2f}€ (ίσοποσα)")
        print(f"   • Reserve Fund per Apartment: {reserve_per_apartment:.2f}€ (ίσοποσα)")
        print()
        
        print("📋 FINAL RESULTS PER APARTMENT:")
        print("-" * 40)
        
        for apt in apartments:
            # Expenses with participation mills (if any)
            expenses_with_mills = (total_expenses_month * (apt.participation_mills or 0) / total_mills) if total_mills > 0 else 0
            
            # Reserve fund with participation mills (if any)
            reserve_with_mills = (reserve_fund_monthly_target * (apt.participation_mills or 0) / total_mills) if total_mills > 0 else reserve_per_apartment
            
            # Management (equal for all)
            management = management_per_apartment
            
            # Total
            total = expenses_with_mills + reserve_with_mills + management
            
            print(f"   • Apartment {apt.number} ({apt.participation_mills} χιλιοστά):")
            print(f"     - Expenses: {expenses_with_mills:.2f}€ (με χιλιοστά)")
            print(f"     - Reserve Fund: {reserve_with_mills:.2f}€ (με χιλιοστά)")
            print(f"     - Management: {management:.2f}€ (ίσοποσα)")
            print(f"     - TOTAL: {total:.2f}€")
            print()
        
        print("=" * 60)
        print("💡 FINAL SUMMARY:")
        print("   ✅ Expenses → με χιλιοστά ιδιοκτησίας")
        print("   ✅ Reserve Fund → με χιλιοστά ιδιοκτησίας")
        print("   ✅ Management Costs → ίσοποσα ανά διαμέρισμα")
        print("   🎯 This is the correct logic for AddPaymentModal!")

if __name__ == "__main__":
    test_final_distribution()
