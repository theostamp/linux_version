#!/usr/bin/env python3
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building

def check_building_9():
    try:
        building = Building.objects.get(id=9)
        print(f"🔍 Building ID 9 found:")
        print(f"   Name: {building.name}")
        print(f"   Address: {building.address}")
        print(f"   Street View Image: {building.street_view_image}")
        print(f"   Street View Image type: {type(building.street_view_image)}")
        print(f"   Street View Image is None: {building.street_view_image is None}")
        print(f"   Street View Image is empty: {building.street_view_image == ''}")
        
        # Check all fields
        print(f"\n🔍 All fields:")
        for field in building._meta.fields:
            value = getattr(building, field.name)
            print(f"   {field.name}: {value} (type: {type(value)})")
            
    except Building.DoesNotExist:
        print("❌ Building with ID 9 not found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_building_9() 