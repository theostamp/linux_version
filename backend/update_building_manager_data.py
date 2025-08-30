#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def update_building_manager_data():
    """Update building manager data with apartment and collection schedule"""
    
    with schema_context('demo'):
        print("🏢 Updating Building Manager Data")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        print(f"🏠 Building: {building.name}")
        print(f"📍 Address: {building.address}, {building.city} {building.postal_code}")
        
        # Update manager data with apartment and collection schedule
        building.internal_manager_apartment = "Α1"  # Example apartment
        building.internal_manager_collection_schedule = "Δευτέρα & Τετάρτη 17:00-19:00"
        building.save()
        
        print(f"\n✅ Updated Manager Data:")
        print(f"   • Name: {building.internal_manager_name}")
        print(f"   • Phone: {building.internal_manager_phone}")
        print(f"   • Apartment: {building.internal_manager_apartment}")
        print(f"   • Collection Schedule: {building.internal_manager_collection_schedule}")
        
        print(f"\n📋 Full Building Address:")
        print(f"   • {building.address}")
        print(f"   • {building.city} {building.postal_code}")

if __name__ == "__main__":
    update_building_manager_data()
