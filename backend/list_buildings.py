#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

with schema_context('demo'):
    buildings = Building.objects.all()
    print(f"Found {buildings.count()} buildings:")
    for building in buildings:
        print(f"- {building.name} (ID: {building.id}) - Reserve: {building.current_reserve}€")
