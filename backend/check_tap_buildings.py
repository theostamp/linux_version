#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

with schema_context('tap'):
    buildings = Building.objects.all()
    print(f'Buildings in tap tenant: {buildings.count()}')
    for building in buildings:
        print(f'- {building.name} ({building.address})')