#!/usr/bin/env python3
"""
Script για έλεγχο του building API endpoint
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal

def test_building_api():
    """Ελέγχει το building API endpoint"""
    
    print("🧪 ΕΛΕΓΧΟΣ BUILDING API ENDPOINT")
    print("=" * 60)
    
    # Get demo tenant
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {client.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Check in tenant context
    with tenant_context(client):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name}")
            print(f"   ID: {building.id}")
            
            # Check all fields
            print(f"   📋 Όλα τα πεδία:")
            print(f"      - name: {building.name}")
            print(f"      - address: {building.address}")
            print(f"      - apartments_count: {building.apartments_count}")
            print(f"      - management_fee_per_apartment: {building.management_fee_per_apartment}")
            print(f"      - management_office_name: {building.management_office_name}")
            print(f"      - management_office_phone: {building.management_office_phone}")
            print(f"      - management_office_address: {building.management_office_address}")
            
            # Check if management_fee_per_apartment is None
            if building.management_fee_per_apartment is None:
                print(f"   ⚠️  management_fee_per_apartment είναι None!")
            else:
                print(f"   ✅ management_fee_per_apartment είναι {building.management_fee_per_apartment}")
            
            # Check apartments count
            apartments_count = Apartment.objects.filter(building_id=building.id).count()
            print(f"   🏠 Πραγματικός αριθμός διαμερισμάτων: {apartments_count}")
            
            # Calculate total management cost
            if building.management_fee_per_apartment:
                total_cost = building.management_fee_per_apartment * apartments_count
                print(f"   💰 Συνολικό κόστος διαχείρισης: {total_cost}€")
            else:
                print(f"   💰 Συνολικό κόστος διαχείρισης: 0€ (δεν έχει οριστεί αμοιβή)")

if __name__ == "__main__":
    test_building_api()
