#!/usr/bin/env python3
"""
Script για debug των δεδομένων που λαμβάνει το frontend
"""

import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance
from django.test import RequestFactory
from financial.views import MonthlyBalanceViewSet

def debug_frontend_data():
    """Debug των δεδομένων που λαμβάνει το frontend"""
    
    with schema_context('demo'):
        print("🔍 Debug Frontend Data")
        print("=" * 60)
        
        # Δημιουργία request
        factory = RequestFactory()
        request = factory.get('/api/financial/monthly-balances/by_building/?building_id=1')
        request.query_params = request.GET
        
        # Κλήση του ViewSet
        viewset = MonthlyBalanceViewSet()
        response = viewset.by_building(request)
        
        # JSON serialization για να δούμε τι στέλνει το API
        from django.http import JsonResponse
        json_data = json.dumps(response.data, indent=2)
        
        print("API Response (JSON):")
        print(json_data)
        
        # Έλεγχος συγκεκριμένων μηνών
        print("\n🔍 Έλεγχος συγκεκριμένων μηνών:")
        print("-" * 40)
        
        target_months = [
            (2025, 7),
            (2025, 8),
            (2025, 9)
        ]
        
        for year, month in target_months:
            balance_data = None
            for data in response.data:
                if data['year'] == year and data['month'] == month:
                    balance_data = data
                    break
            
            if balance_data:
                print(f"\n📊 {month:02d}/{year}:")
                print(f"   • carry_forward: {balance_data.get('carry_forward')} (type: {type(balance_data.get('carry_forward'))})")
                print(f"   • net_result: {balance_data.get('net_result')} (type: {type(balance_data.get('net_result'))})")
                print(f"   • previous_obligations: {balance_data.get('previous_obligations')} (type: {type(balance_data.get('previous_obligations'))})")
                
                # Έλεγχος JavaScript comparison
                carry_forward = balance_data.get('carry_forward')
                print(f"   • JavaScript !== 0: {carry_forward != 0}")
                print(f"   • JavaScript !== null: {carry_forward is not None}")
                print(f"   • JavaScript !== undefined: {carry_forward is not None}")
            else:
                print(f"\n❌ Δεν βρέθηκε {month:02d}/{year}")

if __name__ == "__main__":
    debug_frontend_data()
