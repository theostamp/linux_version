#!/usr/bin/env python3
"""
Script για προσθήκη sample δεδομένων χιλιοστών θέρμανσης και ανελκυστήρα
"""

import os
import sys
import django
from decimal import Decimal

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from apartments.models import Apartment
from buildings.models import Building
from tenants.models import Client

def add_mills_data():
    """Προσθήκη sample δεδομένων χιλιοστών"""
    
    print("🔧 Προσθήκη δεδομένων χιλιοστών...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Βρέθηκε tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Χρήση tenant context
    with tenant_context(tenant):
        # Εύρεση του κτιρίου 3
        try:
            building = Building.objects.get(id=3)
            print(f"🏢 Βρέθηκε κτίριο: {building.name}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 3")
            return
        
        # Εύρεση όλων των διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        if not apartments.exists():
            print("❌ Δεν βρέθηκαν διαμερίσματα")
            return
        
        print(f"📋 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # Sample δεδομένα χιλιοστών (διαφορετικά για κάθε διαμέρισμα)
        mills_data = {
            '1': {'heating': 85, 'elevator': 80},
            '2': {'heating': 75, 'elevator': 70},
            '3': {'heating': 90, 'elevator': 85},
            '4': {'heating': 80, 'elevator': 75},
            '5': {'heating': 95, 'elevator': 90},
            '6': {'heating': 70, 'elevator': 65},
            '7': {'heating': 85, 'elevator': 80},
            '8': {'heating': 100, 'elevator': 95},
            '9': {'heating': 75, 'elevator': 70},
            '10': {'heating': 90, 'elevator': 85},
            '11': {'heating': 80, 'elevator': 75},
            '12': {'heating': 95, 'elevator': 90},
        }
        
        updated_count = 0
        
        for apartment in apartments:
            apartment_number = apartment.number
            if apartment_number in mills_data:
                data = mills_data[apartment_number]
                
                # Ενημέρωση χιλιοστών
                apartment.heating_mills = data['heating']
                apartment.elevator_mills = data['elevator']
                apartment.save()
                
                updated_count += 1
                print(f"🏠 Διαμέρισμα {apartment_number}: Θέρμανση={data['heating']}χλ., Ανελκυστήρα={data['elevator']}χλ.")
        
        print(f"\n✅ Ενημερώθηκαν {updated_count} διαμερίσματα")
        
        # Επιβεβαίωση
        print("\n📊 Επιβεβαίωση δεδομένων:")
        print("-" * 60)
        print(f"{'Διαμέρισμα':<12} {'Συμμετοχής':<12} {'Θέρμανσης':<12} {'Ανελκυστήρα':<12}")
        print("-" * 60)
        
        total_heating = 0
        total_elevator = 0
        
        for apartment in apartments:
            heating = apartment.heating_mills or 0
            elevator = apartment.elevator_mills or 0
            participation = apartment.participation_mills or 0
            
            total_heating += heating
            total_elevator += elevator
            
            print(f"{apartment.number:<12} {participation:<12} {heating:<12} {elevator:<12}")
        
        print("-" * 60)
        print(f"{'ΣΥΝΟΛΟ':<12} {sum(apt.participation_mills or 0 for apt in apartments):<12} {total_heating:<12} {total_elevator:<12}")
        
        print(f"\n🎉 Ολοκληρώθηκε η προσθήκη δεδομένων χιλιοστών!")

if __name__ == "__main__":
    add_mills_data()
