#!/usr/bin/env python3
"""
Script to test the apartments_summary endpoint fix
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

def test_apartments_summary_fix():
    """Test the apartments_summary endpoint fix"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🧪 ΔΟΚΙΜΗ ΔΙΟΡΘΩΣΗΣ APARTMENTS_SUMMARY ENDPOINT")
        print("=" * 80)
        
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/financial/building/1/apartments-summary/?month=2024-09')
        
        # Mock user and query_params
        request.user = CustomUser.objects.filter(is_superuser=True).first()
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        print("🔍 Testing apartments_summary endpoint...")
        
        try:
            # Call the apartments_summary method
            response = viewset.apartments_summary(request, pk=1)
            
            print(f"📊 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"✅ API Response successful!")
                print(f"📈 Number of apartments: {len(data)}")
                
                # Check first few apartments
                total_previous_balance = 0
                for i, apt in enumerate(data[:3]):  # Show first 3 apartments
                    previous_balance = apt.get('previous_balance', 0)
                    current_balance = apt.get('current_balance', 0)
                    total_previous_balance += abs(previous_balance)
                    
                    print(f"  Διαμέρισμα {apt.get('apartment_number', 'N/A')}:")
                    print(f"    previous_balance: {previous_balance:.2f} €")
                    print(f"    current_balance: {current_balance:.2f} €")
                
                # Calculate total from all apartments
                total_previous_from_all = sum(abs(apt.get('previous_balance', 0)) for apt in data)
                print(f"\n💰 Συνολικές παλαιότερες οφειλές: {total_previous_from_all:.2f} €")
                
                # Check if this matches the expected 650.00 €
                if abs(total_previous_from_all - 650.00) < 0.01:
                    print("✅ Οι παλαιότερες οφειλές είναι σωστές (650,00 €)")
                else:
                    print(f"❌ Οι παλαιότερες οφειλές δεν είναι σωστές. Αναμενόμενο: 650,00 €, Πραγματικό: {total_previous_from_all:.2f} €")
                
            else:
                print(f"❌ API Response failed: {response.data}")
                
        except Exception as e:
            print(f"❌ Error calling API: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n" + "=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        print("Αυτό το script δοκιμάζει την διόρθωση του apartments_summary endpoint")
        print("για να δούμε αν τώρα επιστρέφει τα σωστά previous_balance")

if __name__ == "__main__":
    test_apartments_summary_fix()
