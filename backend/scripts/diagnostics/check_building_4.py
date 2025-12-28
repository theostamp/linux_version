#!/usr/bin/env python3
"""
Script to check and update building 4's street view image
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building

def main():
    try:
        # Get the demo tenant
        client = Client.objects.get(schema_name='demo')
        print(f"Working with tenant: {client.name}")
        
        with tenant_context(client):
            # Check building 4
            try:
                building = Building.objects.get(id=4)
                print("\nBuilding 4 details:")
                print(f"  - ID: {building.id}")
                print(f"  - Name: {building.name}")
                print(f"  - Address: {building.address}")
                print(f"  - Street View Image: {building.street_view_image}")
                print(f"  - Coordinates: {building.latitude}, {building.longitude}")
                
                # Update street view image if it's None
                if building.street_view_image is None:
                    # Create a sample street view image URL based on coordinates
                    if building.latitude and building.longitude:
                        street_view_url = f"https://maps.googleapis.com/maps/api/streetview?size=600x300&location={building.latitude},{building.longitude}&key=YOUR_API_KEY"
                        print(f"\nUpdating street view image to: {street_view_url}")
                        building.street_view_image = street_view_url
                        building.save()
                        print("✅ Street view image updated successfully!")
                    else:
                        print("❌ Cannot create street view URL - missing coordinates")
                else:
                    print("✅ Street view image already exists")
                    
            except Building.DoesNotExist:
                print("❌ Building with ID 4 does not exist")
                
                # List all available buildings
                buildings = Building.objects.all()
                print(f"\nAvailable buildings ({buildings.count()}):")
                for b in buildings:
                    print(f"  - ID: {b.id}, Name: {b.name}")
                    
    except Client.DoesNotExist:
        print("❌ Demo tenant not found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 