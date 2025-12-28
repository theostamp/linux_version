#!/usr/bin/env python3
"""
Script για τη δημιουργία βασικών δεδομένων (building, users)
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from tenants.models import Client

User = get_user_model()

def create_basic_data():
    """Δημιουργία βασικών δεδομένων"""
    print("🚀 Ξεκινά η δημιουργία βασικών δεδομένων...")
    
    # Δημιουργία tenant
    tenant, created = Client.objects.get_or_create(
        name='Demo Tenant',
        schema_name='demo_teams',
        defaults={
            'paid_until': '2025-12-31',
            'on_trial': False,
            'created_on': '2024-01-01'
        }
    )
    if created:
        print(f"✅ Δημιουργήθηκε tenant: {tenant.name}")
    
    # Δημιουργία building
    building, created = Building.objects.get_or_create(
        name='Demo Building',
        defaults={
            'address': 'Λεωφ. Συγγρού 123, Αθήνα',
            'total_apartments': 24,
            'year_built': 1990,
            'floors': 8,
            'current_reserve': 50000.00,
            'latitude': 37.9838,
            'longitude': 23.7275
        }
    )
    if created:
        print(f"✅ Δημιουργήθηκε building: {building.name}")
    
    # Δημιουργία χρηστών
    users_data = [
        {
            'email': 'admin@demo.com',
            'first_name': 'Διαχειριστής',
            'last_name': 'Συστήματος',
            'is_staff': True,
            'is_superuser': True
        },
        {
            'email': 'manager@demo.com',
            'first_name': 'Μάνατζερ',
            'last_name': 'Κτιρίου',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user1@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Ένας',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user2@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Δύο',
            'is_staff': False,
            'is_superuser': False
        },
        {
            'email': 'user3@demo.com',
            'first_name': 'Χρήστης',
            'last_name': 'Τρεις',
            'is_staff': False,
            'is_superuser': False
        }
    ]
    
    users = []
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                **user_data,
                'is_active': True
            }
        )
        if created:
            user.set_password('demo123')
            user.save()
            print(f"✅ Δημιουργήθηκε χρήστης: {user.get_full_name()} ({user.email})")
        users.append(user)
    
    print("\n✅ Η δημιουργία βασικών δεδομένων ολοκληρώθηκε!")
    print("📊 Στατιστικά:")
    print(f"   - Tenant: {Client.objects.count()}")
    print(f"   - Buildings: {Building.objects.count()}")
    print(f"   - Users: {User.objects.count()}")
    
    return building, users

if __name__ == '__main__':
    create_basic_data() 