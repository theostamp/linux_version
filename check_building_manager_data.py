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

def check_manager_data():
    """Check building manager data in database"""
    
    with schema_context('demo'):
        print("🏢 Building Manager Data")
        print("=" * 50)
        
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏠 Building: {building.name} (ID: {building.id})")
            print(f"📍 Address: {building.address}, {building.city} {building.postal_code}")
            
            # Internal Manager
            print("\n👤 Internal Manager:")
            print(f"   • Name: {building.internal_manager_name or 'Not set'}")
            print(f"   • Phone: {building.internal_manager_phone or 'Not set'}")
            
            # Management Office
            print("\n🏢 Management Office:")
            print(f"   • Name: {building.management_office_name or 'Not set'}")
            print(f"   • Phone: {building.management_office_phone or 'Not set'}")
            print(f"   • Address: {building.management_office_address or 'Not set'}")
            
            # External Manager (CustomUser)
            if building.manager:
                print("\n👨‍💼 External Manager (User):")
                print(f"   • Name: {building.manager.get_full_name() or building.manager.email}")
                print(f"   • Email: {building.manager.email}")
                if hasattr(building.manager, 'phone'):
                    print(f"   • Phone: {building.manager.phone or 'Not set'}")
            else:
                print("\n👨‍💼 External Manager: Not assigned")

if __name__ == "__main__":
    check_manager_data()
