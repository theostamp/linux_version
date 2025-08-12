#!/usr/bin/env python3
"""
Script για τη δημιουργία νέου κτιρίου στη Σόλωνος 22, Αθήνα
με 10 διαμερίσματα και πλήρη στοιχεία ιδιοκτητών/ενοικιαστών
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from users.models import CustomUser
from django_tenants.utils import schema_context

def create_solonos_building():
    """Δημιουργία κτιρίου στη Σόλωνος 22, Αθήνα"""
    
    print("🚀 Δημιουργία κτιρίου στη Σόλωνος 22, Αθήνα...")
    
    # Χρήση του demo tenant
    with schema_context('demo'):
        # Δημιουργία κτιρίου
        building = Building.objects.create(
            name="Κτίριο Σόλωνος 22",
            address="Σόλωνος 22",
            city="Αθήνα",
            postal_code="106 73",
            apartments_count=10,
            current_reserve=Decimal('0.00'),  # Δεν συμπληρώνουμε οικονομικά στοιχεία
            heating_fixed_percentage=Decimal('30.00'),
            reserve_contribution_per_apartment=Decimal('5.00')
        )
        
        print(f"✅ Δημιουργήθηκε το κτίριο: {building.name} (ID: {building.id})")
        
        # Δεδομένα διαμερισμάτων
        apartments_data = [
            # 7 διαμερίσματα με ενοικιαστές
            {
                'number': 'A1',
                'floor': 1,
                'owner_name': 'Γεώργιος Παπαδόπουλος',
                'owner_phone': '2101234567',
                'owner_phone2': '6971234567',
                'owner_email': 'papadopoulos@email.com',
                'ownership_percentage': Decimal('12.500'),
                'participation_mills': 125,
                'heating_mills': 120,
                'elevator_mills': 125,
                'tenant_name': 'Μαρία Κωνσταντίνου',
                'tenant_phone': '2102345678',
                'tenant_phone2': '6972345678',
                'tenant_email': 'maria.konstantinou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 85,
                'bedrooms': 2
            },
            {
                'number': 'A2',
                'floor': 1,
                'owner_name': 'Ελένη Δημητρίου',
                'owner_phone': '2103456789',
                'owner_phone2': '6973456789',
                'owner_email': 'eleni.dimitriou@email.com',
                'ownership_percentage': Decimal('11.200'),
                'participation_mills': 112,
                'heating_mills': 110,
                'elevator_mills': 112,
                'tenant_name': 'Νίκος Αλεξίου',
                'tenant_phone': '2104567890',
                'tenant_phone2': '6974567890',
                'tenant_email': 'nikos.alexiou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 75,
                'bedrooms': 2
            },
            {
                'number': 'B1',
                'floor': 2,
                'owner_name': 'Δημήτρης Παπαγιάννης',
                'owner_phone': '2105678901',
                'owner_phone2': '6975678901',
                'owner_email': 'dimitris.papagiannis@email.com',
                'ownership_percentage': Decimal('13.100'),
                'participation_mills': 131,
                'heating_mills': 125,
                'elevator_mills': 131,
                'tenant_name': 'Αννα Παπαδοπούλου',
                'tenant_phone': '2106789012',
                'tenant_phone2': '6976789012',
                'tenant_email': 'anna.papadopoulou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 95,
                'bedrooms': 3
            },
            {
                'number': 'B2',
                'floor': 2,
                'owner_name': 'Κωνσταντίνος Γεωργίου',
                'owner_phone': '2107890123',
                'owner_phone2': '6977890123',
                'owner_email': 'konstantinos.georgiou@email.com',
                'ownership_percentage': Decimal('10.800'),
                'participation_mills': 108,
                'heating_mills': 105,
                'elevator_mills': 108,
                'tenant_name': 'Ελένη Παπαδοπούλου',
                'tenant_phone': '2108901234',
                'tenant_phone2': '6978901234',
                'tenant_email': 'eleni.papadopoulou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 70,
                'bedrooms': 1
            },
            {
                'number': 'C1',
                'floor': 3,
                'owner_name': 'Αικατερίνη Νικολάου',
                'owner_phone': '2109012345',
                'owner_phone2': '6979012345',
                'owner_email': 'aikaterini.nikolaou@email.com',
                'ownership_percentage': Decimal('12.000'),
                'participation_mills': 120,
                'heating_mills': 115,
                'elevator_mills': 120,
                'tenant_name': 'Γιώργος Κωνσταντίνου',
                'tenant_phone': '2100123456',
                'tenant_phone2': '6970123456',
                'tenant_email': 'giorgos.konstantinou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 80,
                'bedrooms': 2
            },
            {
                'number': 'C2',
                'floor': 3,
                'owner_name': 'Μιχάλης Αντωνίου',
                'owner_phone': '2101234568',
                'owner_phone2': '6971234568',
                'owner_email': 'michalis.antoniou@email.com',
                'ownership_percentage': Decimal('11.500'),
                'participation_mills': 115,
                'heating_mills': 110,
                'elevator_mills': 115,
                'tenant_name': 'Δέσποινα Αλεξίου',
                'tenant_phone': '2102345679',
                'tenant_phone2': '6972345679',
                'tenant_email': 'despoina.alexiou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 78,
                'bedrooms': 2
            },
            {
                'number': 'D1',
                'floor': 4,
                'owner_name': 'Σοφία Παπαδοπούλου',
                'owner_phone': '2103456780',
                'owner_phone2': '6973456780',
                'owner_email': 'sofia.papadopoulou@email.com',
                'ownership_percentage': Decimal('12.800'),
                'participation_mills': 128,
                'heating_mills': 125,
                'elevator_mills': 128,
                'tenant_name': 'Ανδρέας Δημητρίου',
                'tenant_phone': '2104567891',
                'tenant_phone2': '6974567891',
                'tenant_email': 'andreas.dimitriou@email.com',
                'is_rented': True,
                'is_closed': False,
                'square_meters': 90,
                'bedrooms': 3
            },
            
            # 2 διαμερίσματα ιδιοκατοίκησης
            {
                'number': 'D2',
                'floor': 4,
                'owner_name': 'Ιωάννης Κωνσταντίνου',
                'owner_phone': '2105678902',
                'owner_phone2': '6975678902',
                'owner_email': 'ioannis.konstantinou@email.com',
                'ownership_percentage': Decimal('11.000'),
                'participation_mills': 110,
                'heating_mills': 105,
                'elevator_mills': 110,
                'tenant_name': '',
                'tenant_phone': '',
                'tenant_phone2': '',
                'tenant_email': '',
                'is_rented': False,
                'is_closed': False,
                'square_meters': 72,
                'bedrooms': 2
            },
            {
                'number': 'E1',
                'floor': 5,
                'owner_name': 'Ευαγγελία Παπαγιάννη',
                'owner_phone': '2107890124',
                'owner_phone2': '6977890124',
                'owner_email': 'evangelia.papagianni@email.com',
                'ownership_percentage': Decimal('13.500'),
                'participation_mills': 135,
                'heating_mills': 130,
                'elevator_mills': 135,
                'tenant_name': '',
                'tenant_phone': '',
                'tenant_phone2': '',
                'tenant_email': '',
                'is_rented': False,
                'is_closed': False,
                'square_meters': 100,
                'bedrooms': 3
            },
            
            # 1 κενό διαμέρισμα
            {
                'number': 'E2',
                'floor': 5,
                'owner_name': 'Αλέξανδρος Γεωργίου',
                'owner_phone': '2109012346',
                'owner_phone2': '6979012346',
                'owner_email': 'alexandros.georgiou@email.com',
                'ownership_percentage': Decimal('10.600'),
                'participation_mills': 106,
                'heating_mills': 100,
                'elevator_mills': 106,
                'tenant_name': '',
                'tenant_phone': '',
                'tenant_phone2': '',
                'tenant_email': '',
                'is_rented': False,
                'is_closed': True,
                'square_meters': 68,
                'bedrooms': 1
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
        
        print(f"\n📊 Σύνοψη δημιουργίας:")
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
        print(f"🏠 Συνολικά διαμερίσματα: {len(created_apartments)}")
        print(f"💰 Συνολικά χιλιοστά συμμετοχής: {total_mills}")
        print(f"🔥 Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
        print(f"🛗 Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
        
        print(f"\n📋 Κατανομή διαμερισμάτων:")
        rented_count = sum(1 for apt in created_apartments if apt.is_rented)
        owner_occupied_count = sum(1 for apt in created_apartments if not apt.is_rented and not apt.is_closed)
        empty_count = sum(1 for apt in created_apartments if apt.is_closed)
        
        print(f"🏠 Ενοικιασμένα: {rented_count}")
        print(f"👤 Ιδιοκατοίκηση: {owner_occupied_count}")
        print(f"🚪 Κενά: {empty_count}")
        
        return building, created_apartments

if __name__ == "__main__":
    try:
        building, apartments = create_solonos_building()
        print(f"\n🎉 Η δημιουργία ολοκληρώθηκε επιτυχώς!")
        print(f"🆔 ID Κτιρίου: {building.id}")
    except Exception as e:
        print(f"❌ Σφάλμα κατά τη δημιουργία: {e}")
        sys.exit(1)
