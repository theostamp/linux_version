#!/usr/bin/env python3
"""
Script to test the API endpoint for September 2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.test import RequestFactory
from django_tenants.utils import schema_context

from financial.views import FinancialDashboardViewSet
from users.models import CustomUser

def test_api_endpoint_september():
    """Test the API endpoint for September 2024"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🧪 ΔΟΚΙΜΗ API ENDPOINT ΣΕΠΤΕΜΒΡΙΟΥ 2024")
        print("=" * 80)
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/summary/?building_id=1&month=2024-09')
        
        # Mock user and query_params
        request.user = CustomUser.objects.filter(is_superuser=True).first()
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        print("🔍 Testing financial dashboard summary endpoint...")
        
        try:
            # Call the summary method
            response = viewset.summary(request)
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"✅ API Response successful!")
                print(f"📈 Total Balance: {data.get('total_balance', 'N/A')} €")
                print(f"📈 Current Obligations: {data.get('current_obligations', 'N/A')} €")
                print(f"📈 Previous Obligations: {data.get('previous_obligations', 'N/A')} €")
                print(f"📈 Current Reserve: {data.get('current_reserve', 'N/A')} €")
                print(f"📈 Total Expenses Month: {data.get('total_expenses_month', 'N/A')} €")
                print(f"📈 Total Payments Month: {data.get('total_payments_month', 'N/A')} €")
                
                # Check apartment balances
                apartment_balances = data.get('apartment_balances', [])
                print(f"\n🏠 Apartment Balances ({len(apartment_balances)} apartments):")
                
                total_previous_balance = 0
                for apt in apartment_balances:
                    previous_balance = apt.get('previous_balance', 0)
                    total_previous_balance += abs(previous_balance)
                    print(f"  Διαμέρισμα {apt.get('apartment_number', 'N/A')}: {previous_balance:.2f} €")
                
                print(f"\n💰 Συνολικές παλαιότερες οφειλές: {total_previous_balance:.2f} €")
                print(f"💰 Previous Obligations από API: {data.get('previous_obligations', 'N/A')} €")
                
                # Check if they match
                api_previous = data.get('previous_obligations', 0)
                if abs(total_previous_balance - api_previous) < 0.01:
                    print("✅ Οι υπολογισμοί ταιριάζουν!")
                else:
                    print(f"❌ Διαφορά: {abs(total_previous_balance - api_previous):.2f} €")
                
            else:
                print(f"❌ API Response failed: {response.data}")
                
        except Exception as e:
            print(f"❌ Error calling API: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        print("Αυτό το script δοκιμάζει το API endpoint που καλεί το frontend")
        print("για να δούμε αν επιστρέφει τα σωστά στοιχεία για τον Σεπτέμβριο")

if __name__ == "__main__":
    test_api_endpoint_september()
