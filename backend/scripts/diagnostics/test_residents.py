#!/usr/bin/env python3
"""
Test script για το residents API
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from buildings.models import Building
from residents.models import Resident

User = get_user_model()

def test_residents():
    print("=== Testing Residents API ===")
    
    # Εκτύπωση όλων των κτιρίων
    print("\n1. Όλα τα κτίρια:")
    buildings = Building.objects.all()
    for building in buildings:
        print(f"  - ID: {building.id}, Name: {building.name}, Manager: {building.manager}")
    
    # Εκτύπωση όλων των χρηστών
    print("\n2. Όλοι οι χρήστες:")
    users = User.objects.all()
    for user in users:
        print(f"  - ID: {user.id}, Email: {user.email}, Role: {getattr(user, 'role', 'N/A')}")
    
    # Εκτύπωση όλων των κατοίκων
    print("\n3. Όλοι οι κάτοικοι:")
    residents = Resident.objects.select_related('user', 'building').all()
    for resident in residents:
        print(f"  - ID: {resident.id}, User: {resident.user.email}, Building: {resident.building.name}, Apartment: {resident.apartment}, Role: {resident.role}")
    
    # Έλεγχος για συγκεκριμένο κτίριο
    if buildings.exists():
        building = buildings.first()
        print(f"\n4. Κάτοικοι για κτίριο '{building.name}' (ID: {building.id}):")
        building_residents = Resident.objects.filter(building=building).select_related('user')
        for resident in building_residents:
            print(f"  - {resident.user.email} στο {resident.apartment} (ρόλος: {resident.role})")

if __name__ == '__main__':
    test_residents() 