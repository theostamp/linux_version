#!/usr/bin/env python3
"""
Script to update building 4's street view image with a realistic placeholder
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

def main():
    try:
        # Get the demo tenant
        client = Client.objects.get(schema_name='demo')
        print(f"Working with tenant: {client.name}")
        
        with tenant_context(client):
            # Check building 4
            try:
                building = Building.objects.get(id=4)
                print(f"\nBuilding 4 details:")
                print(f"  - ID: {building.id}")
                print(f"  - Name: {building.name}")
                print(f"  - Address: {building.address}")
                print(f"  - Current Street View Image: {building.street_view_image}")
                
                # Update with a realistic placeholder image
                # Using a placeholder service that generates building-like images
                placeholder_url = f"https://picsum.photos/600/300?random={building.id}"
                
                print(f"\nUpdating street view image to: {placeholder_url}")
                building.street_view_image = placeholder_url
                building.save()
                print("✅ Street view image updated successfully!")
                
                # Verify the update
                building.refresh_from_db()
                print(f"  - Updated Street View Image: {building.street_view_image}")
                    
            except Building.DoesNotExist:
                print(f"❌ Building with ID 4 does not exist")
                
    except Client.DoesNotExist:
        print("❌ Demo tenant not found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 