#!/usr/bin/env python3
"""
Script to check all tenants and their data.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment

def check_all_tenants():
    """Check all tenants and their data"""
    print("🔍 Checking all tenants and their data...")
    
    clients = Client.objects.all()
    if not clients.exists():
        print("❌ No tenants found!")
        return
    
    for client in clients:
        print(f"\n🏢 Tenant: {client.name} (schema: {client.schema_name})")
        print("=" * 50)
        
        with tenant_context(client):
            # Check buildings
            buildings = Building.objects.all()
            print(f"Buildings: {buildings.count()}")
            for building in buildings:
                print(f"  {building.id}: {building.name} ({building.apartments_count} apts)")
            
            # Check apartments
            apartments = Apartment.objects.all()
            print(f"Apartments: {apartments.count()}")
            
            if apartments.exists():
                for apt in apartments[:10]:  # Show first 10
                    print(f"  Building {apt.building_id}, Apt {apt.number}")
                if apartments.count() > 10:
                    print(f"  ... and {apartments.count() - 10} more")
            else:
                print("  No apartments found")

def main():
    """Main function"""
    print("🏢 All Tenants Data Checker")
    print("=" * 50)
    
    check_all_tenants()
    print("\nDone!")

if __name__ == "__main__":
    main()