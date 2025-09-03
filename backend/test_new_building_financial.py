#!/usr/bin/env python3
"""
Test script to verify financial data for new buildings
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append('/app')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.services import FinancialDashboardService
from buildings.models import Building
from financial.models import Payment, Expense

def test_new_building_financial():
    """Test financial data for a new building"""
    
    # Get the demo tenant
    client = Client.objects.get(schema_name='demo')
    
    print("🔍 Testing Financial Data for New Building")
    print("=" * 50)
    
    with tenant_context(client):
        # Get the first building
        building = Building.objects.first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {building.apartments_count}")
        
        # Check if there are any financial data
        total_payments = Payment.objects.filter(
            apartment__building_id=building.id
        ).count()
        
        total_expenses = Expense.objects.filter(
            building_id=building.id
        ).count()
        
        print("\n📊 Υπάρχοντα οικονομικά δεδομένα:")
        print(f"  - Πληρωμές: {total_payments}")
        print(f"  - Δαπάνες: {total_expenses}")
        
        if total_payments == 0 and total_expenses == 0:
            print("✅ Το κτίριο δεν έχει οικονομικά δεδομένα (όπως αναμένεται)")
        else:
            print("⚠️  Το κτίριο έχει οικονομικά δεδομένα")
        
        # Test the financial dashboard service
        print("\n🧮 Δοκιμή FinancialDashboardService:")
        try:
            service = FinancialDashboardService(building.id)
            summary = service.get_summary()
            
            print(f"  - Τρέχον αποθεματικό: {summary['current_reserve']:10.2f}€")
            print(f"  - Συνολικό υπόλοιπο: {summary['total_balance']:10.2f}€")
            print(f"  - Τρέχουσες υποχρεώσεις: {summary['current_obligations']:10.2f}€")
            print(f"  - Αριθμός διαμερισμάτων: {summary['apartments_count']}")
            print(f"  - Εκκρεμείς πληρωμές: {summary['pending_payments']}")
            print(f"  - Μέσος μηνιαίος κόστος: {summary['average_monthly_expenses']:10.2f}€")
            
            # Verify that for a new building, the values should be 0 or reasonable defaults
            if summary['current_reserve'] == 0:
                print("✅ Τρέχον αποθεματικό είναι 0 (σωστό για νέο κτίριο)")
            else:
                print(f"⚠️  Τρέχον αποθεματικό δεν είναι 0: {summary['current_reserve']}")
            
            if summary['total_balance'] == 0:
                print("✅ Συνολικό υπόλοιπο είναι 0 (σωστό για νέο κτίριο)")
            else:
                print(f"⚠️  Συνολικό υπόλοιπο δεν είναι 0: {summary['total_balance']}")
            
            if summary['current_obligations'] == 0:
                print("✅ Τρέχουσες υποχρεώσεις είναι 0 (σωστό για νέο κτίριο)")
            else:
                print(f"⚠️  Τρέχουσες υποχρεώσεις δεν είναι 0: {summary['current_obligations']}")
            
            if summary['pending_payments'] == 0:
                print("✅ Εκκρεμείς πληρωμές είναι 0 (σωστό για νέο κτίριο)")
            else:
                print(f"⚠️  Εκκρεμείς πληρωμές δεν είναι 0: {summary['pending_payments']}")
            
            if summary['average_monthly_expenses'] == 0:
                print("✅ Μέσος μηνιαίος κόστος είναι 0 (σωστό για νέο κτίριο)")
            else:
                print(f"⚠️  Μέσος μηνιαίος κόστος δεν είναι 0: {summary['average_monthly_expenses']}")
                
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη δοκιμή: {e}")
        
        # Test API endpoint
        print("\n🌐 Δοκιμή API Endpoint:")
        try:
            from django.test import RequestFactory
            from financial.views import FinancialDashboardViewSet
            
            factory = RequestFactory()
            request = factory.get(f'/financial/dashboard/summary/?building_id={building.id}')
            
            # Mock the request user and permissions
            request.user = None
            request.query_params = request.GET
            
            viewset = FinancialDashboardViewSet()
            viewset.request = request
            
            response = viewset.summary(request)
            
            if response.status_code == 200:
                print("✅ API endpoint επιστρέφει 200 OK")
                data = response.data
                print(f"  - Τρέχον αποθεματικό: {data.get('current_reserve', 0):10.2f}€")
                print(f"  - Συνολικό υπόλοιπο: {data.get('total_balance', 0):10.2f}€")
                print(f"  - Αριθμός διαμερισμάτων: {data.get('apartments_count', 0)}")
            else:
                print(f"❌ API endpoint επιστρέφει {response.status_code}")
                
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη δοκιμή API: {e}")

if __name__ == "__main__":
    test_new_building_financial()
