#!/usr/bin/env python3
"""
Simple script to check existing buildings and their coordinate status
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building

def check_buildings():
    """
    Check all buildings and their coordinate status
    """
    all_buildings = Building.objects.all()
    
    print(f"🔍 Total buildings: {all_buildings.count()}")
    
    buildings_with_coords = Building.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False
    )
    
    buildings_without_coords = Building.objects.filter(
        latitude__isnull=True,
        longitude__isnull=True
    )
    
    print(f"✅ Buildings with coordinates: {buildings_with_coords.count()}")
    print(f"❌ Buildings without coordinates: {buildings_without_coords.count()}")
    
    print("\n📋 Buildings without coordinates:")
    for building in buildings_without_coords:
        print(f"  - {building.name}: {building.address}, {building.city}, {building.postal_code}")
    
    print("\n📍 Buildings with coordinates:")
    for building in buildings_with_coords:
        print(f"  - {building.name}: {building.latitude}, {building.longitude}")

if __name__ == "__main__":
    print("🚀 Checking buildings...")
    check_buildings()
    print("🏁 Finished!") 