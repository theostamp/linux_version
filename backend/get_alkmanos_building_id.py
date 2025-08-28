#!/usr/bin/env python
"""
Script για να βρω το ID του κτιρίου Αλκμάνος 22
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

def get_alkmanos_building_id():
    """Βρίσκει το ID του κτιρίου Αλκμάνος 22"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(name='Αλκμάνος 22')
            print(f"✅ ID του κτιρίου Αλκμάνος 22: {building.id}")
            print(f"   Όνομα: {building.name}")
            print(f"   Διεύθυνση: {building.address}")
            return building.id
        except Building.DoesNotExist:
            print("❌ Το κτίριο 'Αλκμάνος 22' δεν βρέθηκε!")
            return None

if __name__ == "__main__":
    get_alkmanos_building_id()
