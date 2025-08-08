#!/usr/bin/env python3
"""
Script για να βρω το ID του κτιρίου Αραχώβης 12
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from django_tenants.utils import schema_context

def get_building_id():
    """Βρίσκει το ID του κτιρίου Αραχώβης 12"""
    with schema_context('demo'):
        building = Building.objects.get(name='Αραχώβης 12')
        print(f"ID του κτιρίου Αραχώβης 12: {building.id}")
        return building.id

if __name__ == '__main__':
    get_building_id()
