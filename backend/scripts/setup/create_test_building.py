#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from users.models import CustomUser

def create_test_building():
    try:
        # Get the test tenant
        tenant = Client.objects.get(schema_name='test_tenant')
        print(f'Found tenant: {tenant.name}')
        
        # Get the user
        user = CustomUser.objects.get(email='admin@test.com')
        print(f'Found user: {user.email}')
        
        # Create building in tenant context
        with tenant_context(tenant):
            building = Building.objects.create(
                name='Test Building',
                address='Test Address 123',
                manager=user,
                current_reserve=1000.00
            )
            print(f'Created building: {building.name} with manager: {building.manager.email}')
            
            # Create some apartments
            apartments_data = [
                {'number': '1', 'owner_name': 'Ιωάννης Παπαδόπουλος', 'participation_mills': 1000, 'current_balance': 0.00},
                {'number': '2', 'owner_name': 'Μαρία Κωνσταντίνου', 'participation_mills': 1200, 'current_balance': 0.00},
                {'number': '3', 'owner_name': 'Γεώργιος Δημητρίου', 'participation_mills': 800, 'current_balance': 0.00},
                {'number': '4', 'owner_name': 'Ελένη Παπαδοπούλου', 'participation_mills': 1000, 'current_balance': 0.00},
            ]
            
            for apt_data in apartments_data:
                apartment = Apartment.objects.create(
                    building=building,
                    number=apt_data['number'],
                    owner_name=apt_data['owner_name'],
                    participation_mills=apt_data['participation_mills'],
                    current_balance=apt_data['current_balance']
                )
                print(f'Created apartment: {apartment.number} - {apartment.owner_name}')
            
            print(f'✅ Created building with {len(apartments_data)} apartments')
            
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    create_test_building() 