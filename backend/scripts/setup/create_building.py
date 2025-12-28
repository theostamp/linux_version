#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from users.models import CustomUser

def create_building():
    try:
        # Get the tap tenant
        tenant = Client.objects.get(schema_name='tap')
        print(f'Found tenant: {tenant.name}')
        
        # Get the user
        user = CustomUser.objects.get(email='tap@gmail.com')
        print(f'Found user: {user.email}')
        
        # Create building in tenant context
        with tenant_context(tenant):
            building = Building.objects.create(
                name='Test Building',
                address='Test Address',
                manager=user
            )
            print(f'Created building: {building.name} with manager: {building.manager.email}')
            
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    create_building() 