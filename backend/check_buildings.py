#!/usr/bin/env python3
"""
Script για έλεγχο των buildings στη βάση δεδομένων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment


def check_buildings():
    """Έλεγχος των buildings"""
    
    with schema_context('demo'):
        print("🏢 Έλεγχος buildings στη βάση δεδομένων")
        print("=" * 50)
        
        buildings = Building.objects.all()
        print(f"📊 Συνολικά buildings: {buildings.count()}")
        print()
        
        for building in buildings:
            apartments_count = Apartment.objects.filter(building=building).count()
            print(f"🏢 Building ID {building.id}: {building.name}")
            print(f"   Διεύθυνση: {building.address}")
            print(f"   Διαμερίσματα: {apartments_count}")
            print()


if __name__ == "__main__":
    check_buildings()
