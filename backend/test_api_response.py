#!/usr/bin/env python3
"""
Script για έλεγχο του API response format
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
from apartments.models import Apartment
from buildings.models import Building

def test_api_response_format():
    """Ελέγχει το format του API response"""
    
    print("🌐 ΕΛΕΓΧΟΣ API RESPONSE FORMAT")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Get building
            building = Building.objects.get(id=3)
            print(f"🏢 Κτίριο: {building.name}, {building.address}")
            print()
            
            # Get all apartments
            apartments = Apartment.objects.filter(building=building).order_by('number')
            
            print(f"📋 ΕΛΕΓΧΟΣ {apartments.count()} ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print("-" * 60)
            
            # Simulate the API response format
            apartments_summary = []
            for apartment in apartments:
                apartment_data = {
                    'id': apartment.id,
                    'number': apartment.number,
                    'owner_name': apartment.owner_name,
                    'tenant_name': apartment.tenant_name,
                    'current_balance': float(apartment.current_balance or 0),
                    'monthly_due': 0.0,  # This would be calculated
                    'building_id': apartment.building.id,
                    'building_name': apartment.building.name,
                    'participation_mills': apartment.participation_mills,
                    'heating_mills': apartment.heating_mills,
                    'elevator_mills': apartment.elevator_mills,
                    'latest_payment_date': None,  # This would be from payments
                    'latest_payment_amount': None,  # This would be from payments
                }
                apartments_summary.append(apartment_data)
                
                print(f"Διαμέρισμα {apartment.number:2}:")
                print(f"   ID: {apartment_data['id']}")
                print(f"   Heating Mills: {apartment_data['heating_mills']}")
                print(f"   Elevator Mills: {apartment_data['elevator_mills']}")
                print(f"   Participation Mills: {apartment_data['participation_mills']}")
                print()
            
            # Check if heating_mills are present in the response
            heating_mills_present = any(apt.get('heating_mills') is not None for apt in apartments_summary)
            elevator_mills_present = any(apt.get('elevator_mills') is not None for apt in apartments_summary)
            
            print("🔍 ΕΛΕΓΧΟΣ API RESPONSE:")
            print(f"   Heating Mills: {'✅' if heating_mills_present else '❌'}")
            print(f"   Elevator Mills: {'✅' if elevator_mills_present else '❌'}")
            
            if heating_mills_present:
                total_heating = sum(apt.get('heating_mills', 0) or 0 for apt in apartments_summary)
                print(f"   Συνολικά Heating Mills: {total_heating}")
            
            # Show sample JSON response
            print("\n📄 SAMPLE API RESPONSE (first apartment):")
            sample_response = apartments_summary[0] if apartments_summary else {}
            print(json.dumps(sample_response, indent=2, ensure_ascii=False))
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID 3")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    test_api_response_format()
