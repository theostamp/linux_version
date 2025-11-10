#!/usr/bin/env python3
"""
Script για δημιουργία νέας πολυκατοικίας στην Αλκμάνος 22, Αθήνα
με 10 διαμερίσματα και αληθοφανή δεδομένα ενοικων και χιλιοστών
"""

import os
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from users.models import CustomUser

def create_alkmanos_building():
    """Δημιουργία πολυκατοικίας Αλκμάνος 22"""
    
    try:
        # Εύρεση του demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
        
        # Εύρεση διαχειριστή
        try:
            manager = CustomUser.objects.filter(is_staff=True).first()
            if not manager:
                manager = CustomUser.objects.first()
            print(f"👤 Διαχειριστής: {manager.email if manager else 'Δεν βρέθηκε'}")
        except:
            manager = None
        
        # Δημιουργία κτιρίου στο tenant context
        with tenant_context(tenant):
            # Δημιουργία κτιρίου
            building = Building.objects.create(
                name="Πολυκατοικία Αλκμάνος 22",
                address="Αλκμάνος 22",
                city="Αθήνα",
                postal_code="11528",
                manager=manager,
                apartments_count=10,
                current_reserve=0.00,  # Δεν συμπληρώνουμε οικονομικά στοιχεία - θα υπολογιστούν από τις συναλλαγές
                heating_fixed_percentage=30.0,
                reserve_contribution_per_apartment=5.0,
                latitude=37.9838,
                longitude=23.7275
            )
            print(f"✅ Δημιουργήθηκε κτίριο: {building.name}")
            
            # Δεδομένα διαμερισμάτων με αληθοφανή ονόματα και χιλιοστά
            apartments_data = [
                {
                    'number': '1',
                    'floor': 0,
                    'owner_name': 'Γεώργιος Παπαδόπουλος',
                    'owner_phone': '2101234567',
                    'owner_email': 'papadopoulos@email.com',
                    'participation_mills': 95,
                    'heating_mills': 98,
                    'elevator_mills': 95,
                    'square_meters': 85,
                    'bedrooms': 2,
                    'is_rented': True,
                    'tenant_name': 'Μαρία Κωνσταντίνου',
                    'tenant_phone': '2102345678',
                    'tenant_email': 'maria.k@email.com',
                    'rent_start_date': date(2023, 1, 1),
                    'rent_end_date': date(2025, 12, 31)
                },
                {
                    'number': '2',
                    'floor': 0,
                    'owner_name': 'Ελένη Δημητρίου',
                    'owner_phone': '2103456789',
                    'owner_email': 'eleni.d@email.com',
                    'participation_mills': 102,
                    'heating_mills': 105,
                    'elevator_mills': 102,
                    'square_meters': 90,
                    'bedrooms': 2,
                    'is_rented': False,
                    'is_closed': False
                },
                {
                    'number': '3',
                    'floor': 1,
                    'owner_name': 'Νικόλαος Αλεξίου',
                    'owner_phone': '2104567890',
                    'owner_email': 'nikos.alex@email.com',
                    'participation_mills': 88,
                    'heating_mills': 92,
                    'elevator_mills': 88,
                    'square_meters': 75,
                    'bedrooms': 1,
                    'is_rented': True,
                    'tenant_name': 'Ανδρέας Παπαγεωργίου',
                    'tenant_phone': '2105678901',
                    'tenant_email': 'andreas.p@email.com',
                    'rent_start_date': date(2023, 3, 15),
                    'rent_end_date': date(2024, 12, 31)
                },
                {
                    'number': '4',
                    'floor': 1,
                    'owner_name': 'Αικατερίνη Σταματίου',
                    'owner_phone': '2106789012',
                    'owner_email': 'katerina.s@email.com',
                    'participation_mills': 110,
                    'heating_mills': 115,
                    'elevator_mills': 110,
                    'square_meters': 95,
                    'bedrooms': 3,
                    'is_rented': False,
                    'is_closed': False
                },
                {
                    'number': '5',
                    'floor': 2,
                    'owner_name': 'Δημήτριος Κωνσταντίνου',
                    'owner_phone': '2107890123',
                    'owner_email': 'dimitris.k@email.com',
                    'participation_mills': 105,
                    'heating_mills': 108,
                    'elevator_mills': 105,
                    'square_meters': 92,
                    'bedrooms': 2,
                    'is_rented': True,
                    'tenant_name': 'Σοφία Παπαδοπούλου',
                    'tenant_phone': '2108901234',
                    'tenant_email': 'sofia.pap@email.com',
                    'rent_start_date': date(2022, 9, 1),
                    'rent_end_date': date(2025, 8, 31)
                },
                {
                    'number': '6',
                    'floor': 2,
                    'owner_name': 'Ιωάννης Μιχαηλίδης',
                    'owner_phone': '2109012345',
                    'owner_email': 'giannis.m@email.com',
                    'participation_mills': 98,
                    'heating_mills': 102,
                    'elevator_mills': 98,
                    'square_meters': 88,
                    'bedrooms': 2,
                    'is_rented': False,
                    'is_closed': False
                },
                {
                    'number': '7',
                    'floor': 3,
                    'owner_name': 'Αννα Παπαδοπούλου',
                    'owner_phone': '2100123456',
                    'owner_email': 'anna.pap@email.com',
                    'participation_mills': 92,
                    'heating_mills': 95,
                    'elevator_mills': 92,
                    'square_meters': 82,
                    'bedrooms': 2,
                    'is_rented': True,
                    'tenant_name': 'Χρήστος Γεωργίου',
                    'tenant_phone': '2101234567',
                    'tenant_email': 'christos.g@email.com',
                    'rent_start_date': date(2023, 6, 1),
                    'rent_end_date': date(2024, 5, 31)
                },
                {
                    'number': '8',
                    'floor': 3,
                    'owner_name': 'Παναγιώτης Αντωνίου',
                    'owner_phone': '2102345678',
                    'owner_email': 'panagiotis.a@email.com',
                    'participation_mills': 115,
                    'heating_mills': 120,
                    'elevator_mills': 115,
                    'square_meters': 100,
                    'bedrooms': 3,
                    'is_rented': False,
                    'is_closed': False
                },
                {
                    'number': '9',
                    'floor': 4,
                    'owner_name': 'Ευαγγελία Κωνσταντίνου',
                    'owner_phone': '2103456789',
                    'owner_email': 'evangelia.k@email.com',
                    'participation_mills': 108,
                    'heating_mills': 112,
                    'elevator_mills': 108,
                    'square_meters': 96,
                    'bedrooms': 3,
                    'is_rented': True,
                    'tenant_name': 'Δημήτριος Παπαδόπουλος',
                    'tenant_phone': '2104567890',
                    'tenant_email': 'dimitris.pap@email.com',
                    'rent_start_date': date(2023, 2, 1),
                    'rent_end_date': date(2025, 1, 31)
                },
                {
                    'number': '10',
                    'floor': 4,
                    'owner_name': 'Μιχαήλ Γεωργίου',
                    'owner_phone': '2105678901',
                    'owner_email': 'michalis.g@email.com',
                    'participation_mills': 87,
                    'heating_mills': 93,
                    'elevator_mills': 87,
                    'square_meters': 78,
                    'bedrooms': 1,
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
            
            print("\n📊 Κατανομή Χιλιοστών:")
            print("-" * 60)
            print(f"{'Διαμέρισμα':<12} {'Χιλιοστά':<10} {'Ποσοστό':<10} {'Κατάσταση':<15} {'Τετ.μ.':<8}")
            print("-" * 60)
            
            for apartment in created_apartments:
                mills = apartment.participation_mills
                percentage = (mills / 1000) * 100
                status = "Ενοικιασμένο" if apartment.is_rented else "Ιδιοκατοίκηση" if apartment.owner_name else "Κενό"
                sqm = apartment.square_meters or 0
                print(f"{apartment.number:<12} {mills:<10} {percentage:<10.1f}% {status:<15} {sqm:<8}")
            
            print("-" * 60)
            print(f"{'ΣΥΝΟΛΟ':<12} {total_mills:<10} {'100.0':<10}%")
            
            return building, created_apartments
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()
        return None, None

if __name__ == "__main__":
    building, apartments = create_alkmanos_building()
    if building:
        print("\n🎉 Επιτυχής δημιουργία πολυκατοικίας Αλκμάνος 22!")
        print(f"🏢 ID Κτιρίου: {building.id}")
        print(f"🏠 Συνολικά διαμερίσματα: {len(apartments) if apartments else 0}")
    else:
        print("❌ Αποτυχία στη δημιουργία της πολυκατοικίας")
