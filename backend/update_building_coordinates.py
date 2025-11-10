#!/usr/bin/env python3
"""
Script to update existing buildings with coordinates from Google Maps Geocoding API
"""

import os
import django
import requests
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building

def get_coordinates_from_address(address, city, postal_code):
    """
    Get coordinates from Google Maps Geocoding API
    """
    api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    if not api_key:
        print("❌ GOOGLE_MAPS_API_KEY not found in environment variables")
        return None
    
    # Construct full address
    full_address = f"{address}, {city}, {postal_code}, Greece"
    
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': full_address,
        'key': api_key
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            location = data['results'][0]['geometry']['location']
            return {
                'lat': Decimal(str(location['lat'])),
                'lng': Decimal(str(location['lng']))
            }
        else:
            print(f"⚠️  No results found for: {full_address}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting coordinates for {full_address}: {e}")
        return None

def update_buildings_with_coordinates():
    """
    Update buildings that don't have coordinates
    """
    # Get buildings without coordinates
    buildings_without_coords = Building.objects.filter(
        latitude__isnull=True,
        longitude__isnull=True
    )
    
    print(f"🔍 Found {buildings_without_coords.count()} buildings without coordinates")
    
    if buildings_without_coords.count() == 0:
        print("✅ All buildings already have coordinates!")
        return
    
    updated_count = 0
    failed_count = 0
    
    for building in buildings_without_coords:
        print(f"\n📍 Processing: {building.name} - {building.address}")
        
        if not building.address or not building.city or not building.postal_code:
            print(f"⚠️  Skipping {building.name} - missing address information")
            failed_count += 1
            continue
        
        coordinates = get_coordinates_from_address(
            building.address, 
            building.city, 
            building.postal_code
        )
        
        if coordinates:
            building.latitude = coordinates['lat']
            building.longitude = coordinates['lng']
            building.save()
            print(f"✅ Updated {building.name} with coordinates: {coordinates['lat']}, {coordinates['lng']}")
            updated_count += 1
        else:
            print(f"❌ Failed to get coordinates for {building.name}")
            failed_count += 1
    
    print("\n📊 Summary:")
    print(f"✅ Successfully updated: {updated_count} buildings")
    print(f"❌ Failed to update: {failed_count} buildings")
    print(f"📈 Total processed: {updated_count + failed_count} buildings")

if __name__ == "__main__":
    print("🚀 Starting building coordinates update...")
    update_buildings_with_coordinates()
    print("🏁 Finished!") 