#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_demo_buildings():
    """Check if there are buildings in the demo tenant"""
    print("🔍 Checking buildings in demo tenant...")
    
    with schema_context('demo'):
        buildings = Building.objects.all()
        print(f"Found {buildings.count()} buildings in demo tenant:")
        
        for building in buildings:
            print(f"  - ID: {building.id}, Name: {building.name}, Address: {building.address}")
            
        if buildings.count() == 0:
            print("❌ No buildings found in demo tenant")
        else:
            print("✅ Buildings found in demo tenant")

if __name__ == "__main__":
    check_demo_buildings() 