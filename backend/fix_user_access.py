#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building, BuildingMembership
from users.models import CustomUser

with schema_context('tap'):
    # Get the user
    try:
        user = CustomUser.objects.get(email='tap@gmail.com')
        print(f"Found user: {user.email}")
    except CustomUser.DoesNotExist:
        print("User tap@gmail.com not found, creating...")
        user = CustomUser.objects.create_user(
            email='tap@gmail.com',
            password='tap123456',
            first_name='Tap',
            last_name='User',
            is_active=True
        )
        print(f"Created user: {user.email}")
    
    # Get the first building
    building = Building.objects.first()
    if building:
        print(f"Found building: {building.name}")
        
        # Create building membership
        membership, created = BuildingMembership.objects.get_or_create(
            building=building,
            resident=user,
            defaults={'role': 'resident'}
        )
        
        if created:
            print(f"Created building membership: {user.email} -> {building.name}")
        else:
            print(f"Building membership already exists: {user.email} -> {building.name}")
    else:
        print("No buildings found!")