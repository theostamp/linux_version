#!/usr/bin/env python3
"""
Test apartment_balances API for apartment A1
"""

import os
import sys
import django
import json
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_api_apartment_balances():
    """Test apartment_balances API for apartment A1"""
    
    with schema_context('demo'):
        from financial.views import FinancialDashboardViewSet
        from django.test import RequestFactory
        from users.models import CustomUser as User
        
        print("🔍 TEST APARTMENT_BALANCES API")
        print("=" * 50)
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/apartment_balances/?building_id=1&month=2025-08')
        
        # Use existing user
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(email='test3@example.com', password='testpass')
        request.user = user
        
        # Add query_params attribute
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        # Call the apartment_balances method
        response = viewset.apartment_balances(request)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            print(f"Total apartments: {len(data.get('apartments', []))}")
            
            # Find apartment A1
            a1_data = None
            for apt in data.get('apartments', []):
                if apt.get('apartment_number') == 'Α1':
                    a1_data = apt
                    break
            
            if a1_data:
                print(f"\n🏠 ΔΙΑΜΕΡΙΣΜΑ Α1:")
                print(f"   • ID: {a1_data.get('apartment_id')}")
                print(f"   • Number: {a1_data.get('apartment_number')}")
                print(f"   • Owner: {a1_data.get('owner_name')}")
                print(f"   • Current Balance: {a1_data.get('current_balance')}")
                print(f"   • Previous Balance: {a1_data.get('previous_balance')}")
                print(f"   • Expense Share: {a1_data.get('expense_share')}")
                print(f"   • Total Obligations: {a1_data.get('total_obligations')}")
                print(f"   • Total Payments: {a1_data.get('total_payments')}")
                print(f"   • Net Obligation: {a1_data.get('net_obligation')}")
                print(f"   • Status: {a1_data.get('status')}")
            else:
                print("❌ Διαμέρισμα Α1 δεν βρέθηκε στο API response")
        else:
            print(f"❌ API error: {response.status_code}")
            print(f"Response: {response.data}")

if __name__ == "__main__":
    test_api_apartment_balances()
