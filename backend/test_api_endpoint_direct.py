#!/usr/bin/env python3
"""
Script για έλεγχο του API endpoint απευθείας από το Django
"""

import os
import sys
import django
import json

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.views import FinancialDashboardViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
from users.models import CustomUser
from buildings.models import Building

def test_api_endpoint_direct():
    """Ελέγχει το API endpoint απευθείας από το Django"""
    
    print("🌐 ΕΛΕΓΧΟΣ API ENDPOINT ΑΠΕΥΘΕΙΑΣ")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Get building by address
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            building_id = building.id
            print(f"🏢 Κτίριο: {building.name}, {building.address} (ID: {building_id})")
            print()
            
            # Create a test user for authentication
            user, created = CustomUser.objects.get_or_create(
                email='test@example.com',
                defaults={
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            
            # Create API request factory
            factory = APIRequestFactory()
            
            # Create request
            request = factory.get(f'/api/financial/building/{building_id}/apartments-summary/')
            force_authenticate(request, user=user)
            
            # Create viewset instance
            viewset = FinancialDashboardViewSet()
            viewset.action = 'apartments_summary'
            
            # Call the method
            response = viewset.apartments_summary(request, pk=building_id)
            
            print(f"📡 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                print(f"✅ Επιτυχία! Λήφθηκαν {len(data)} διαμερίσματα")
                
                if data:
                    # Show first apartment data
                    first_apt = data[0]
                    print("\n📋 Πρώτο διαμέρισμα:")
                    print(f"   ID: {first_apt.get('id')}")
                    print(f"   Number: {first_apt.get('number')}")
                    print(f"   Owner: {first_apt.get('owner_name')}")
                    print(f"   Participation Mills: {first_apt.get('participation_mills')}")
                    print(f"   Heating Mills: {first_apt.get('heating_mills')}")
                    print(f"   Elevator Mills: {first_apt.get('elevator_mills')}")
                    
                    # Check if heating_mills are present
                    heating_mills_present = any(apt.get('heating_mills') is not None for apt in data)
                    elevator_mills_present = any(apt.get('elevator_mills') is not None for apt in data)
                    
                    print("\n🔍 Έλεγχος πεδίων:")
                    print(f"   Heating Mills: {'✅' if heating_mills_present else '❌'}")
                    print(f"   Elevator Mills: {'✅' if elevator_mills_present else '❌'}")
                    
                    if heating_mills_present:
                        total_heating = sum(apt.get('heating_mills', 0) or 0 for apt in data)
                        print(f"   Συνολικά Heating Mills: {total_heating}")
                    
                    # Show sample JSON response
                    print("\n📄 SAMPLE JSON RESPONSE:")
                    print(json.dumps(first_apt, indent=2, ensure_ascii=False))
                    
                else:
                    print("⚠️ Δεν βρέθηκαν διαμερίσματα")
            else:
                print(f"❌ Σφάλμα: {response.status_code}")
                print(f"   Response: {response.data}")
                
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22, Αθήνα 115 28")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_api_endpoint_direct()
