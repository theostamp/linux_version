#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment

def simple_check():
    print("🔍 Απλός Έλεγχος Δεδομένων")
    print("=" * 40)
    
    # Έλεγχος clients
    clients = Client.objects.all()
    print(f"📋 Βρέθηκαν {clients.count()} clients:")
    for client in clients:
        print(f"   - {client.name} (schema: {client.schema_name})")
    
    print()
    
    # Έλεγχος κτιρίων
    buildings = Building.objects.all()
    print(f"🏢 Βρέθηκαν {buildings.count()} κτίρια:")
    for building in buildings:
        print(f"   - {building.name} - {building.address}")
    
    print()
    
    # Έλεγχος διαμερισμάτων
    apartments = Apartment.objects.all()
    print(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα:")
    
    # Ομαδοποίηση ανά κτίριο
    buildings_with_apartments = {}
    for apt in apartments:
        building_name = apt.building.name if apt.building else "Άγνωστο κτίριο"
        if building_name not in buildings_with_apartments:
            buildings_with_apartments[building_name] = []
        buildings_with_apartments[building_name].append(apt.name)
    
    for building_name, apt_list in buildings_with_apartments.items():
        print(f"   📍 {building_name}: {', '.join(apt_list)}")

if __name__ == "__main__":
    simple_check()
