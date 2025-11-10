#!/usr/bin/env python3
"""
Script για έλεγχο API endpoint monthly_due
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

def test_api_monthly_due():
    """Έλεγχος API endpoint για monthly_due"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ API ENDPOINT MONTHLY_DUE")
        print("=" * 60)
        
        # 1. Βάση δεδομένων κτιρίου
        building = Building.objects.get(id=1)
        apartment = Apartment.objects.get(id=3)
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print()
        
        # 2. Έλεγχος API endpoint
        print("🌐 ΕΛΕΓΧΟΣ API ENDPOINT")
        
        # Χρήση του Django test client με tenant context
        from django.test import Client
        
        client = Client()
        
        # Κλήση του API endpoint με tenant context
        url = f'/api/financial/building/{building.id}/apartments-summary/'
        response = client.get(url, HTTP_HOST='demo.localhost')
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API endpoint επέστρεψε {len(data)} διαμερίσματα")
            
            # Βρες το διαμέρισμα 3
            apartment_data = None
            for apt in data:
                if apt['id'] == 3:
                    apartment_data = apt
                    break
            
            if apartment_data:
                print("🏠 Διαμέρισμα 3:")
                print(f"   📊 Monthly due: {apartment_data.get('monthly_due', 'N/A')}€")
                print(f"   💳 Current balance: {apartment_data.get('current_balance', 'N/A')}€")
                print(f"   👤 Owner: {apartment_data.get('owner_name', 'N/A')}")
                
                monthly_due = apartment_data.get('monthly_due', 0)
                if monthly_due == 52.0:
                    print("✅ Monthly due είναι σωστό: 52€")
                else:
                    print(f"❌ Monthly due είναι λάθος: {monthly_due}€ (αναμενόμενο: 52€)")
            else:
                print("❌ Δεν βρέθηκε το διαμέρισμα 3 στα δεδομένα")
        else:
            print(f"❌ API endpoint απέτυχε με status code: {response.status_code}")
            print(f"   Response: {response.content}")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    test_api_monthly_due()
