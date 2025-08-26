#!/usr/bin/env python3
"""
Script to test consistency between current obligations and total balance
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

def test_obligations_consistency():
    """Test consistency between current obligations and total balance"""
    
    with schema_context('demo'):
        # Test both buildings
        buildings = Building.objects.all()[:2]  # Αραχώβης 12 and Αλκμάνος 22
        
        for building in buildings:
            print(f"🔍 TESTING CONSISTENCY FOR {building.name}")
            print("=" * 60)
            
            dashboard_service = FinancialDashboardService(building.id)
            
            # Test current view (no month)
            print("📊 CURRENT VIEW (no month):")
            summary_current = dashboard_service.get_summary()
            current_obligations = summary_current.get('current_obligations', 0)
            total_balance = summary_current.get('total_balance', 0)
            total_management_cost = summary_current.get('total_management_cost', 0)
            
            print(f"   • Current Obligations: {current_obligations:.2f}€")
            print(f"   • Total Balance: {total_balance:.2f}€")
            print(f"   • Total Management Cost: {total_management_cost:.2f}€")
            print()
            
            # Test snapshot view (with current month)
            from datetime import datetime
            current_month = datetime.now().strftime('%Y-%m')
            print(f"📊 SNAPSHOT VIEW ({current_month}):")
            summary_monthly = dashboard_service.get_summary(current_month)
            monthly_obligations = summary_monthly.get('current_obligations', 0)
            monthly_balance = summary_monthly.get('total_balance', 0)
            monthly_expenses = summary_monthly.get('total_expenses_month', 0)
            monthly_management_cost = summary_monthly.get('total_management_cost', 0)
            
            print(f"   • Current Obligations: {monthly_obligations:.2f}€")
            print(f"   • Total Balance: {monthly_balance:.2f}€")
            print(f"   • Monthly Expenses: {monthly_expenses:.2f}€")
            print(f"   • Management Cost: {monthly_management_cost:.2f}€")
            
            # Check consistency
            expected_obligations = monthly_expenses + monthly_management_cost
            print(f"   • Expected Obligations (expenses + management): {expected_obligations:.2f}€")
            
            if abs(monthly_obligations - expected_obligations) < 0.01:
                print("   ✅ CONSISTENCY: Obligations match expected calculation")
            else:
                print("   ❌ INCONSISTENCY: Obligations don't match expected calculation")
            
            # Check if total balance is negative of obligations
            if abs(monthly_balance + monthly_obligations) < 0.01:
                print("   ✅ CONSISTENCY: Total balance is negative of obligations")
            else:
                print("   ❌ INCONSISTENCY: Total balance doesn't match obligations")
            
            print()
            print("📋 SUMMARY:")
            print(f"   • Οικονομικές Υποχρεώσεις Περιόδου: {monthly_obligations:.2f}€")
            print(f"   • Υπόλοιπο Περιόδου: {abs(monthly_balance):.2f}€")
            
            if abs(monthly_obligations - abs(monthly_balance)) < 0.01:
                print("   ✅ PERFECT MATCH: Both tabs show the same amount!")
            else:
                print("   ❌ MISMATCH: Tabs show different amounts")
            
            print("=" * 60)
            print()

if __name__ == "__main__":
    test_obligations_consistency()
