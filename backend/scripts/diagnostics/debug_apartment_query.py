#!/usr/bin/env python3
"""
Debug apartment query
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def debug_apartment_query():
    """Debug apartment query"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from buildings.models import Building
        
        print("🔍 DEBUG APARTMENT QUERY")
        print("=" * 50)
        
        # Get all apartments
        all_apartments = Apartment.objects.all()
        print(f"Total apartments: {all_apartments.count()}")
        
        # Get building 1
        building = Building.objects.get(id=1)
        print(f"Building 1: {building.name}")
        
        # Get apartments in building 1
        building_apartments = Apartment.objects.filter(building=building)
        print(f"Building 1 apartments: {building_apartments.count()}")
        
        for apt in building_apartments:
            print(f"  - {apt.number} (ID: {apt.id})")
        
        # Try to get A1 specifically
        try:
            a1 = Apartment.objects.get(number='A1', building=building)
            print(f"Found A1: {a1.number} (ID: {a1.id})")
        except Apartment.DoesNotExist:
            print("A1 not found with building filter")
        
        # Try to get A1 without building filter
        try:
            a1_all = Apartment.objects.get(number='A1')
            print(f"Found A1 (all): {a1_all.number} (ID: {a1_all.id}) in building {a1_all.building.name}")
        except Apartment.DoesNotExist:
            print("A1 not found at all")
        except Apartment.MultipleObjectsReturned:
            print("Multiple A1 apartments found")
            a1_all = Apartment.objects.filter(number='A1')
            for apt in a1_all:
                print(f"  - {apt.number} in building {apt.building.name}")

if __name__ == "__main__":
    debug_apartment_query()
