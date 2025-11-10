#!/usr/bin/env python3
"""
Λίστα διαμερισμάτων στο demo building
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def list_apartments():
    """Λίστα διαμερισμάτων στο demo building"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from buildings.models import Building
        
        print("🔍 ΛΙΣΤΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("=" * 50)
        
        # Get all buildings
        buildings = Building.objects.all()
        print(f"🏢 Κτίρια: {buildings.count()}")
        
        for building in buildings:
            print(f"\n🏢 Κτίριο {building.id}: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            
            apartments = Apartment.objects.filter(building=building)
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            
            for apt in apartments:
                print(f"   • {apt.number}: {apt.owner_name} (χιλιοστά: {apt.participation_mills})")

if __name__ == "__main__":
    list_apartments()
