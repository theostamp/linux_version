#!/usr/bin/env python3
"""
Script για έλεγχο του κτιρίου Σόλωνος 22
"""

import os
import sys
import django

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment

def check_solonos_building():
    """Έλεγχος του κτιρίου Σόλωνος 22"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(name='Κτίριο Σόλωνος 22')
            print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
            print(f"🏠 Αριθμός διαμερισμάτων: {building.apartments_count}")
            
            apartments = Apartment.objects.filter(building=building)
            print(f"✅ Διαμερίσματα στη βάση: {apartments.count()}")
            
            print("\n📋 Λίστα διαμερισμάτων:")
            for apt in apartments.order_by('number'):
                status = "🏠 Ενοικιασμένο" if apt.is_rented else "👤 Ιδιοκατοίκηση" if not apt.is_closed else "🚪 Κενό"
                print(f"  {apt.number}: {apt.owner_name} - {apt.occupant_name} ({status})")
                print(f"    Χιλιοστά: {apt.participation_mills}, Θέρμανση: {apt.heating_mills}, Ανελκυστήρας: {apt.elevator_mills}")
            
            # Έλεγχος συνολικών χιλιοστών
            total_mills = sum(apt.participation_mills for apt in apartments)
            total_heating_mills = sum(apt.heating_mills for apt in apartments)
            total_elevator_mills = sum(apt.elevator_mills for apt in apartments)
            
            print("\n📊 Σύνοψη χιλιοστών:")
            print(f"💰 Συνολικά χιλιοστά συμμετοχής: {total_mills}")
            print(f"🔥 Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
            print(f"🛗 Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
            
        except Building.DoesNotExist:
            print("❌ Το κτίριο Σόλωνος 22 δεν βρέθηκε!")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    check_solonos_building()
