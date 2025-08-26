#!/usr/bin/env python3
"""
Debug apartment encoding
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def debug_apartment_encoding():
    """Debug apartment encoding"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from buildings.models import Building
        
        print("🔍 DEBUG APARTMENT ENCODING")
        print("=" * 50)
        
        # Get building 1
        building = Building.objects.get(id=1)
        print(f"Building 1: {building.name}")
        
        # Get apartments in building 1
        building_apartments = Apartment.objects.filter(building=building)
        
        for apt in building_apartments:
            print(f"Apartment: '{apt.number}' (ID: {apt.id})")
            print(f"  - ASCII: {repr(apt.number)}")
            print(f"  - Bytes: {apt.number.encode('utf-8')}")
            print(f"  - Length: {len(apt.number)}")
            
            # Check if it starts with Greek or Latin A
            if apt.number.startswith('Α'):  # Greek A
                print(f"  - Starts with Greek Α")
            elif apt.number.startswith('A'):  # Latin A
                print(f"  - Starts with Latin A")
            else:
                print(f"  - Starts with something else")
            print()

if __name__ == "__main__":
    debug_apartment_encoding()
