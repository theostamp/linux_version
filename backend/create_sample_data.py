#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building, BuildingMembership
from tenants.models import Client
from django_tenants.utils import tenant_context

User = get_user_model()

def create_sample_data(tenant_schema):
    """Δημιουργεί sample data για το συγκεκριμένο tenant"""
    
    # Βρίσκω το tenant object
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
    except Client.DoesNotExist:
        print(f"❌ Το tenant '{tenant_schema}' δεν βρέθηκε!")
        return
    
    with tenant_context(tenant):
        print(f"🎯 Δημιουργία sample data για tenant: {tenant_schema}")
        
        # Δημιουργία sample buildings
        buildings_data = [
            {
                'name': 'Αθηνών 12',
                'address': 'Αθηνών 12',
                'city': 'Αθήνα',
                'postal_code': '10431',
                'apartments_count': 24,
                'internal_manager_name': 'Γιώργος Παπαδόπουλος',
                'internal_manager_phone': '2101234567'
            },
            {
                'name': 'Πατησίων 45',
                'address': 'Πατησίων 45',
                'city': 'Αθήνα',
                'postal_code': '10432',
                'apartments_count': 16,
                'internal_manager_name': 'Μαρία Κωνσταντίνου',
                'internal_manager_phone': '2102345678'
            },
            {
                'name': 'Σόλωνος 8',
                'address': 'Σόλωνος 8',
                'city': 'Αθήνα',
                'postal_code': '10433',
                'apartments_count': 12,
                'internal_manager_name': 'Νίκος Δημητρίου',
                'internal_manager_phone': '2103456789'
            }
        ]
        
        # Δημιουργία buildings
        created_buildings = []
        for building_data in buildings_data:
            building, created = Building.objects.get_or_create(
                name=building_data['name'],
                defaults=building_data
            )
            if created:
                print(f"✅ Δημιουργήθηκε κτίριο: {building.name}")
            else:
                print(f"ℹ️ Υπάρχει ήδη κτίριο: {building.name}")
            created_buildings.append(building)
        
        # Δημιουργία sample users
        users_data = [
            {
                'email': 'resident1@athinon12.localhost',
                'first_name': 'Γιώργος',
                'last_name': 'Παπαδόπουλος',
                'password': 'changeme123'
            },
            {
                'email': 'resident2@athinon12.localhost',
                'first_name': 'Μαρία',
                'last_name': 'Κωνσταντίνου',
                'password': 'changeme123'
            },
            {
                'email': 'manager@athinon12.localhost',
                'first_name': 'Νίκος',
                'last_name': 'Δημητρίου',
                'password': 'changeme123',
                'is_staff': True
            }
        ]
        
        # Δημιουργία users
        created_users = []
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'is_staff': user_data.get('is_staff', False)
                }
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                print(f"✅ Δημιουργήθηκε χρήστης: {user.email}")
            else:
                print(f"ℹ️ Υπάρχει ήδη χρήστης: {user.email}")
            created_users.append(user)
        
        # Δημιουργία building memberships
        if created_buildings and created_users:
            # Πρώτος χρήστης στο πρώτο κτίριο
            membership1, created = BuildingMembership.objects.get_or_create(
                building=created_buildings[0],
                resident=created_users[0],
                defaults={'apartment': 'A1', 'role': 'resident'}
            )
            if created:
                print(f"✅ Δημιουργήθηκε membership: {created_users[0].email} → {created_buildings[0].name}")
            
            # Δεύτερος χρήστης στο δεύτερο κτίριο
            membership2, created = BuildingMembership.objects.get_or_create(
                building=created_buildings[1],
                resident=created_users[1],
                defaults={'apartment': 'B2', 'role': 'resident'}
            )
            if created:
                print(f"✅ Δημιουργήθηκε membership: {created_users[1].email} → {created_buildings[1].name}")
            
            # Manager στο τρίτο κτίριο
            membership3, created = BuildingMembership.objects.get_or_create(
                building=created_buildings[2],
                resident=created_users[2],
                defaults={'apartment': 'C3', 'role': 'representative'}
            )
            if created:
                print(f"✅ Δημιουργήθηκε membership: {created_users[2].email} → {created_buildings[2].name}")
        
        print(f"🎉 Ολοκληρώθηκε η δημιουργία sample data για tenant: {tenant_schema}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python create_sample_data.py <tenant_schema>")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    create_sample_data(tenant_schema) 