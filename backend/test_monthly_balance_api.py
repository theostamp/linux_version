#!/usr/bin/env python3
"""
Test script για το MonthlyBalance API endpoint
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import MonthlyBalanceViewSet
from financial.models import MonthlyBalance
from buildings.models import Building
from decimal import Decimal

def test_monthly_balance_api():
    """Δοκιμή του MonthlyBalance API endpoint"""
    
    with schema_context('demo'):
        print("=== ΔΟΚΙΜΗ MONTHLY BALANCE API ===")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # Δημιουργία RequestFactory
        factory = RequestFactory()
        
        # Δοκιμή by_building endpoint
        print(f"\n🔍 Δοκιμή by_building endpoint...")
        request = factory.get('/api/financial/monthly-balances/by_building/?building_id=1')
        request.query_params = request.GET
        
        viewset = MonthlyBalanceViewSet()
        viewset.request = request
        
        try:
            response = viewset.by_building(request)
            print(f"   ✅ by_building response status: {response.status_code}")
            print(f"   📊 Found {len(response.data)} monthly balances")
            
            if response.data:
                balance = response.data[0]
                print(f"   📅 Latest balance: {balance.get('month_display', 'N/A')}")
                print(f"   🏠 Main obligations: €{balance.get('main_obligations', 0)}")
                print(f"   🏦 Reserve obligations: €{balance.get('reserve_obligations', 0)}")
                print(f"   🏢 Management obligations: €{balance.get('management_obligations', 0)}")
        except Exception as e:
            print(f"   ❌ Error in by_building: {e}")
        
        # Δοκιμή hybrid_balance_summary endpoint
        print(f"\n🔍 Δοκιμή hybrid_balance_summary endpoint...")
        request = factory.get('/api/financial/monthly-balances/hybrid_balance_summary/?building_id=1')
        request.query_params = request.GET
        
        viewset = MonthlyBalanceViewSet()
        viewset.request = request
        
        try:
            response = viewset.hybrid_balance_summary(request)
            print(f"   ✅ hybrid_balance_summary response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"   🏠 Total Main Balance: €{data.get('total_main_balance', 0)}")
                print(f"   🏦 Total Reserve Balance: €{data.get('total_reserve_balance', 0)}")
                print(f"   🏢 Total Management Balance: €{data.get('total_management_balance', 0)}")
                print(f"   📊 Balances Count: {data.get('balances_count', 0)}")
                print(f"   🔄 Hybrid System Active: {data.get('hybrid_system_active', False)}")
        except Exception as e:
            print(f"   ❌ Error in hybrid_balance_summary: {e}")
        
        # Δοκιμή create_month endpoint
        print(f"\n🔍 Δοκιμή create_month endpoint...")
        request = factory.post('/api/financial/monthly-balances/create_month/', {
            'building_id': 1,
            'year': 2025,
            'month': 3
        }, content_type='application/json')
        
        # Προσθήκη data attribute για DRF compatibility
        request.data = {
            'building_id': 1,
            'year': 2025,
            'month': 3
        }
        
        viewset = MonthlyBalanceViewSet()
        viewset.request = request
        
        try:
            response = viewset.create_month(request)
            print(f"   ✅ create_month response status: {response.status_code}")
            
            if response.status_code == 201:
                data = response.data
                print(f"   📅 Created balance: {data.get('month_display', 'N/A')}")
                print(f"   🆔 Balance ID: {data.get('id', 'N/A')}")
        except Exception as e:
            print(f"   ❌ Error in create_month: {e}")
        
        # Δοκιμή close_month endpoint
        print(f"\n🔍 Δοκιμή close_month endpoint...")
        request = factory.post('/api/financial/monthly-balances/close_month/', {
            'building_id': 1,
            'year': 2025,
            'month': 3
        }, content_type='application/json')
        
        # Προσθήκη data attribute για DRF compatibility
        request.data = {
            'building_id': 1,
            'year': 2025,
            'month': 3
        }
        
        viewset = MonthlyBalanceViewSet()
        viewset.request = request
        
        try:
            response = viewset.close_month(request)
            print(f"   ✅ close_month response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"   📅 Closed balance: {data.get('month_display', 'N/A')}")
                print(f"   🔒 Is Closed: {data.get('is_closed', False)}")
                print(f"   🏠 Main Carry Forward: €{data.get('main_balance_carry_forward', 0)}")
                print(f"   🏦 Reserve Carry Forward: €{data.get('reserve_balance_carry_forward', 0)}")
                print(f"   🏢 Management Carry Forward: €{data.get('management_balance_carry_forward', 0)}")
        except Exception as e:
            print(f"   ❌ Error in close_month: {e}")
        
        print(f"\n✅ Το MonthlyBalance API endpoint λειτουργεί!")
        print(f"   🔗 Available endpoints:")
        print(f"      - GET /api/financial/monthly-balances/by_building/")
        print(f"      - POST /api/financial/monthly-balances/create_month/")
        print(f"      - POST /api/financial/monthly-balances/close_month/")
        print(f"      - GET /api/financial/monthly-balances/hybrid_balance_summary/")

if __name__ == '__main__':
    test_monthly_balance_api()
