#!/usr/bin/env python3
"""
Script to test if management fees are displayed correctly in the frontend
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
from decimal import Decimal

def test_management_fees_display():
    """Test if management fees are displayed correctly"""
    
    with schema_context('demo'):
        # Test both buildings
        buildings = Building.objects.all()[:2]  # Αραχώβης 12 and Αλκμάνος 22
        
        for building in buildings:
            print(f"🔍 TESTING MANAGEMENT FEES FOR {building.name}")
            print("=" * 60)
            
            dashboard_service = FinancialDashboardService(building.id)
            
            # Test snapshot view (with current month)
            from datetime import datetime
            current_month = datetime.now().strftime('%Y-%m')
            print(f"📊 SNAPSHOT VIEW ({current_month}):")
            summary_monthly = dashboard_service.get_summary(current_month)
            
            # Extract values
            monthly_expenses = summary_monthly.get('total_expenses_month', 0)
            management_cost = summary_monthly.get('total_management_cost', 0)
            management_fee_per_apartment = summary_monthly.get('management_fee_per_apartment', 0)
            apartments_count = summary_monthly.get('apartments_count', 0)
            reserve_fund_monthly_target = summary_monthly.get('reserve_fund_monthly_target', 0)
            current_obligations = summary_monthly.get('current_obligations', 0)
            total_balance = summary_monthly.get('total_balance', 0)
            
            print(f"   • Λειτουργικές Δαπάνες {monthly_expenses:.2f}€")
            print(f"   • Κόστος διαχείρισης: {management_cost:.2f}€")
            print(f"   • Αμοιβή ανά διαμέρισμα: {management_fee_per_apartment:.2f}€")
            print(f"   • Αριθμός διαμερισμάτων: {apartments_count}")
            print(f"   • Εισφορά αποθεματικού: {reserve_fund_monthly_target:.2f}€")
            print()
            
            # Calculate expected values for frontend
            expected_total_obligations = monthly_expenses + management_cost + reserve_fund_monthly_target
            expected_total_balance = -expected_total_obligations
            
            print("📋 FRONTEND DISPLAY EXPECTATIONS:")
            print(f"   • Λειτουργικές Δαπάνες {monthly_expenses:.2f}€")
            if management_cost > 0:
                print(f"   • Κόστος διαχείρισης: {management_cost:.2f}€ ({apartments_count} διαμερίσματα × {management_fee_per_apartment:.2f}€)")
            if reserve_fund_monthly_target > 0:
                print(f"   • Εισφορά αποθεματικού: {reserve_fund_monthly_target:.2f}€")
            print(f"   • Συνολικές υποχρεώσεις μήνα: {expected_total_obligations:.2f}€")
            print(f"   • Υπόλοιπο περιόδου: {abs(expected_total_balance):.2f}€")
            print()
            
            # Check consistency
            print("🔍 CONSISTENCY CHECK:")
            if abs(current_obligations - expected_total_obligations) < 0.01:
                print("   ✅ Current obligations match expected total obligations")
            else:
                print(f"   ❌ Current obligations ({current_obligations:.2f}€) don't match expected ({expected_total_obligations:.2f}€)")
            
            if abs(total_balance - expected_total_balance) < 0.01:
                print("   ✅ Total balance matches expected total balance")
            else:
                print(f"   ❌ Total balance ({total_balance:.2f}€) doesn't match expected ({expected_total_balance:.2f}€)")
            
            # Check if management fees should be displayed
            if management_cost > 0:
                print("   ✅ Management fees should be displayed in frontend")
            else:
                print("   ⚠️ No management fees to display")
            
            print("=" * 60)
            print()

if __name__ == "__main__":
    test_management_fees_display()
