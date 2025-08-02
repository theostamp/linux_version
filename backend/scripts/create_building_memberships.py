#!/usr/bin/env python
"""
Script to create building memberships for demo users
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building, BuildingMembership
from users.models import CustomUser
from django.utils import timezone

def create_building_memberships():
    """Create building memberships for demo users"""
    
    print("🏢 ΔΗΜΙΟΥΡΓΙΑ BUILDING MEMBERSHIPS")
    print("=" * 50)
    
    # Get the demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant")
        return
    
    # Switch to tenant context
    with tenant_context(tenant):
        print(f"🔗 Συνδέομαι στο tenant: {tenant.schema_name}")
        
        # Get users
        try:
            manager = CustomUser.objects.get(email='manager@demo.localhost')
            resident1 = CustomUser.objects.get(email='resident1@demo.localhost')
            resident2 = CustomUser.objects.get(email='resident2@demo.localhost')
            admin = CustomUser.objects.get(email='admin@demo.localhost')
            print("✅ Βρέθηκαν όλοι οι χρήστες")
        except CustomUser.DoesNotExist as e:
            print(f"❌ Σφάλμα: {e}")
            return
        
        # Get buildings
        try:
            building1 = Building.objects.get(name='Αθηνών 12')
            building2 = Building.objects.get(name='Πατησίων 45')
            print("✅ Βρέθηκαν όλα τα κτίρια")
        except Building.DoesNotExist as e:
            print(f"❌ Σφάλμα: {e}")
            return
        
        # Create building memberships
        memberships_data = [
            # Manager memberships (manager can access all buildings)
            (manager, building1, 'manager'),
            (manager, building2, 'manager'),
            
            # Admin memberships (admin can access all buildings)
            (admin, building1, 'admin'),
            (admin, building2, 'admin'),
            
            # Resident memberships
            (resident1, building1, 'resident'),
            (resident2, building2, 'owner'),
        ]
        
        created_count = 0
        for user, building, role in memberships_data:
            membership, created = BuildingMembership.objects.get_or_create(
                building=building,
                resident=user,
                defaults={
                    'role': role,
                    'created_at': timezone.now()
                }
            )
            
            if created:
                print(f"✅ Δημιουργήθηκε membership: {user.email} -> {building.name} ({role})")
                created_count += 1
            else:
                print(f"ℹ️ Υπάρχει ήδη membership: {user.email} -> {building.name} ({role})")
        
        print(f"\n📊 ΣΥΝΟΨΗ:")
        print(f"   Δημιουργήθηκαν: {created_count} νέα memberships")
        print(f"   Συνολικά memberships: {BuildingMembership.objects.count()}")
        
        # Show all memberships
        print(f"\n📋 ΟΛΑ ΤΑ BUILDING MEMBERSHIPS:")
        for membership in BuildingMembership.objects.all():
            print(f"   {membership.resident.email} -> {membership.building.name} ({membership.role})")

if __name__ == '__main__':
    create_building_memberships() 