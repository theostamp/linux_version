#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to verify management fees are properly integrated
in financial calculations
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
from buildings.models import Building
from apartments.models import Apartment
from financial.services import FinancialDashboardService

def test_management_fees_integration():
    """Test that management fees are properly integrated"""
    print("🧪 TESTING MANAGEMENT FEES INTEGRATION")
    print("=" * 50)
    
    building_id = 4
    
    with schema_context('demo'):
        try:
            # Get building info
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id)
            
            print(f"🏢 Building: {building.name}")
            print(f"💶 Management fee per apartment: {building.management_fee_per_apartment}€")
            print(f"🏠 Apartments count: {apartments.count()}")
            
            expected_total_management = building.management_fee_per_apartment * apartments.count()
            print(f"📊 Expected total management fees: {expected_total_management}€")
            
            # Test dashboard service
            dashboard_service = FinancialDashboardService(building_id)
            summary = dashboard_service.get_summary()
            
            print(f"\n📋 DASHBOARD RESULTS:")
            print(f"  💰 Average monthly expenses: {summary['average_monthly_expenses']}€")
            print(f"  🔴 Current obligations: {summary['current_obligations']}€")
            print(f"  💵 Current reserve: {summary['current_reserve']}€")
            print(f"  ⚖️ Total balance: {summary['total_balance']}€")
            
            # Verify integration
            print(f"\n✅ VERIFICATION:")
            
            # Check if management fees are in monthly expenses
            if abs(summary['average_monthly_expenses'] - float(expected_total_management)) < 0.01:
                print(f"✅ Management fees correctly included in average_monthly_expenses")
            else:
                print(f"❌ Management fees NOT properly included in average_monthly_expenses")
                print(f"   Expected: {expected_total_management}€, Got: {summary['average_monthly_expenses']}€")
            
            # Check if management fees are in obligations
            expected_min_obligations = float(expected_total_management)
            if summary['current_obligations'] >= expected_min_obligations:
                print(f"✅ Management fees included in current_obligations")
            else:
                print(f"❌ Management fees NOT properly included in current_obligations")
                print(f"   Expected at least: {expected_min_obligations}€, Got: {summary['current_obligations']}€")
            
            # Check if management fees affect reserve/balance
            if summary['current_reserve'] != summary['total_balance']:
                print(f"⚠️ Current reserve ({summary['current_reserve']}€) ≠ Total balance ({summary['total_balance']}€)")
            else:
                print(f"✅ Current reserve equals total balance")
            
            print(f"\n🎯 EXPECTED FRONTEND DISPLAY:")
            print(f"  Πραγματικά έξοδα: {summary['average_monthly_expenses']:.2f}€")
            print(f"  Τρέχουσες υποχρεώσεις: {abs(summary['current_obligations']):.2f}€")
            print(f"  Υπόλοιπο Περιόδου: {summary['total_balance']:.2f}€")
            
        except Exception as e:
            print(f"❌ ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_management_fees_integration()
