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

def check_tenant_data(tenant_schema):
    """Ελέγχει και εμφανίζει τα δεδομένα του tenant"""
    
    # Βρίσκω το tenant object
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
    except Client.DoesNotExist:
        print(f"❌ Το tenant '{tenant_schema}' δεν βρέθηκε!")
        return
    
    with tenant_context(tenant):
        print(f"🔍 Έλεγχος δεδομένων για tenant: {tenant_schema}")
        print("=" * 50)
        
        # Έλεγχος buildings
        buildings = Building.objects.all()
        print(f"\n🏢 Κτίρια ({buildings.count()}):")
        for building in buildings:
            print(f"  - {building.name}")
            print(f"    Διεύθυνση: {building.address}, {building.city}")
            print(f"    Διαμερίσματα: {building.apartments_count}")
            print(f"    Διαχειριστής: {building.internal_manager_name} ({building.internal_manager_phone})")
        
        # Έλεγχος users
        users = User.objects.all()
        print(f"\n👥 Χρήστες ({users.count()}):")
        for user in users:
            print(f"  - {user.email}")
            print(f"    Όνομα: {user.first_name} {user.last_name}")
            print(f"    Staff: {user.is_staff}")
        
        # Έλεγχος memberships
        memberships = BuildingMembership.objects.all()
        print(f"\n🏠 Building Memberships ({memberships.count()}):")
        for membership in memberships:
            print(f"  - {membership.resident.email} → {membership.building.name}")
            print(f"    Διαμέρισμα: {membership.apartment}")
            print(f"    Ρόλος: {membership.get_role_display()}")
        
        print("\n" + "=" * 50)
        print("✅ Έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Χρήση: python check_data.py <tenant_schema>")
        sys.exit(1)
    
    tenant_schema = sys.argv[1]
    check_tenant_data(tenant_schema) 