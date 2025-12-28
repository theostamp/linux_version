#!/usr/bin/env python3
"""
Script για τη δημιουργία νέου κτιρίου στην Αγαμέμνονος 10, Αθήνα
με 10 διαμερίσματα και μηδενικά ποσά για χρεώσεις και πιστώσεις
"""

import os
import sys
import django

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from django_tenants.utils import schema_context

def create_agamemnonos_building():
    """Δημιουργία κτιρίου στην Αγαμέμνονος 10, Αθήνα"""
    
    print("🚀 Δημιουργία κτιρίου στην Αγαμέμνονος 10, Αθήνα...")
    
    # Χρήση του demo tenant
    with schema_context('demo'):
        
        # Δημιουργία κτιρίου
        building = Building.objects.create(
            name='Αγαμέμνονος 10, Αθήνα',
            address='Αγαμέμνονος 10',
            city='Αθήνα',
            postal_code='118 52',
            apartments_count=10,
            current_reserve=0.00,
            latitude=37.9838,
            longitude=23.7275
        )
        
        print(f"✅ Δημιουργήθηκε κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
        
        # Δεδομένα διαμερισμάτων
        apartments_data = [
            {
                'number': 'Α1',
                'identifier': 'Α1',
                'floor': 1,
                'owner_name': 'Ιδιοκτήτης Α1',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Α2',
                'identifier': 'Α2',
                'floor': 1,
                'owner_name': 'Ιδιοκτήτης Α2',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Β1',
                'identifier': 'Β1',
                'floor': 2,
                'owner_name': 'Ιδιοκτήτης Β1',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Β2',
                'identifier': 'Β2',
                'floor': 2,
                'owner_name': 'Ιδιοκτήτης Β2',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Γ1',
                'identifier': 'Γ1',
                'floor': 3,
                'owner_name': 'Ιδιοκτήτης Γ1',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Γ2',
                'identifier': 'Γ2',
                'floor': 3,
                'owner_name': 'Ιδιοκτήτης Γ2',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Δ1',
                'identifier': 'Δ1',
                'floor': 4,
                'owner_name': 'Ιδιοκτήτης Δ1',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Δ2',
                'identifier': 'Δ2',
                'floor': 4,
                'owner_name': 'Ιδιοκτήτης Δ2',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Ε1',
                'identifier': 'Ε1',
                'floor': 5,
                'owner_name': 'Ιδιοκτήτης Ε1',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            },
            {
                'number': 'Ε2',
                'identifier': 'Ε2',
                'floor': 5,
                'owner_name': 'Ιδιοκτήτης Ε2',
                'owner_phone': '',
                'owner_email': '',
                'participation_mills': 100,
                'heating_mills': 100,
                'elevator_mills': 100,
                'current_balance': 0.00,
                'is_rented': False,
                'is_closed': False
            }
        ]
        
        # Δημιουργία διαμερισμάτων
        created_apartments = []
        for apt_data in apartments_data:
            apartment = Apartment.objects.create(
                building=building,
                **apt_data
            )
            created_apartments.append(apartment)
            print(f"✅ Δημιουργήθηκε διαμέρισμα: {apartment.number} - {apartment.owner_name}")
        
        # Έλεγχος συνολικών χιλιοστών
        total_mills = sum(apt.participation_mills for apt in created_apartments)
        total_heating_mills = sum(apt.heating_mills for apt in created_apartments)
        total_elevator_mills = sum(apt.elevator_mills for apt in created_apartments)
        
        print("\n📊 Σύνοψη δημιουργίας:")
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
        print(f"🏠 Συνολικά διαμερίσματα: {len(created_apartments)}")
        print(f"💰 Συνολικά χιλιοστά συμμετοχής: {total_mills}")
        print(f"🔥 Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
        print(f"🛗 Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
        
        print("\n📋 Κατανομή διαμερισμάτων:")
        rented_count = sum(1 for apt in created_apartments if apt.is_rented)
        owner_occupied_count = sum(1 for apt in created_apartments if not apt.is_rented and not apt.is_closed)
        empty_count = sum(1 for apt in created_apartments if apt.is_closed)
        
        print(f"🏠 Ενοικιασμένα: {rented_count}")
        print(f"👤 Ιδιοκατοίκηση: {owner_occupied_count}")
        print(f"🚪 Κενά: {empty_count}")
        
        print("\n💰 Οικονομική κατάσταση:")
        total_balance = sum(apt.current_balance for apt in created_apartments)
        print(f"💳 Συνολικό υπόλοιπο διαμερισμάτων: {total_balance}€")
        print(f"🏦 Τρέχον αποθεματικό: {building.current_reserve}€")
        
        print("\n✅ Η δημιουργία του κτιρίου ολοκληρώθηκε επιτυχώς!")
        
        return building, created_apartments

if __name__ == "__main__":
    try:
        building, apartments = create_agamemnonos_building()
        print(f"\n🎉 Το κτίριο '{building.name}' δημιουργήθηκε με {len(apartments)} διαμερίσματα!")
    except Exception as e:
        print(f"❌ Σφάλμα κατά τη δημιουργία: {e}")
        import traceback
        traceback.print_exc()
