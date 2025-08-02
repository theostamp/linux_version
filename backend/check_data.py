#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from users.models import CustomUser
from buildings.models import Building, BuildingMembership

with schema_context('tap'):
    print("=== TAP TENANT DATA ===")
    print(f"Users: {CustomUser.objects.count()}")
    print(f"Buildings: {Building.objects.count()}")
    print(f"Building Memberships: {BuildingMembership.objects.count()}")
    
    print("\n=== USERS ===")
    for user in CustomUser.objects.all():
        print(f"- {user.email} ({user.first_name} {user.last_name})")
    
    print("\n=== BUILDINGS ===")
    for building in Building.objects.all():
        print(f"- {building.name} ({building.address})")
    
    print("\n=== BUILDING MEMBERSHIPS ===")
    for membership in BuildingMembership.objects.all():
        print(f"- {membership.resident.email} -> {membership.building.name} ({membership.role})") 