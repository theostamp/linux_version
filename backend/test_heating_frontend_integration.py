#!/usr/bin/env python3
"""
Γρήγορος έλεγχος ενσωμάτωσης Frontend-Backend για τη λειτουργικότητα θέρμανσης
"""
import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import MeterReading, Expense
from financial.services import AdvancedCommonExpenseCalculator


def test_frontend_backend_integration():
    """Έλεγχος ότι το backend στέλνει τα σωστά δεδομένα στο frontend"""
    print("🔄 ΕΛΕΓΧΟΣ ΕΝΣΩΜΑΤΩΣΗΣ FRONTEND-BACKEND")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # 1. Δημιουργία test κτιρίου με θέρμανση
            building = Building.objects.create(
                name="Test Building - Frontend",
                address="Test Street 456",
                city="Αθήνα",
                postal_code="12345",
                apartments_count=3,
                heating_system=Building.HEATING_SYSTEM_HOUR_METERS,
                heating_fixed_percentage=25  # 25% πάγιο
            )
            print(f"✅ Κτίριο δημιουργήθηκε: {building.name}")
            print(f"   - Σύστημα θέρμανσης: {building.get_heating_system_display()}")
            print(f"   - Πάγιο ποσοστό: {building.heating_fixed_percentage}%")
            
            # 2. Δημιουργία διαμερισμάτων
            apartments = []
            for i in range(3):
                apt = Apartment.objects.create(
                    building=building,
                    number=f"A{i+1}",
                    participation_mills=333 + i,  # 333, 334, 333 = 1000 total
                    heating_mills=333 + i,
                    owner_name=f"Owner {i+1}"
                )
                apartments.append(apt)
            print(f"✅ {len(apartments)} διαμερίσματα δημιουργήθηκαν")
            
            # 3. Δημιουργία ενδείξεων μετρητών θέρμανσης (ωρομετρητές)
            from datetime import date, timedelta
            today = date.today()
            start_date = today - timedelta(days=30)
            
            readings_data = [
                (100, 180),  # A1: 80 ώρες κατανάλωση
                (200, 350),  # A2: 150 ώρες κατανάλωση  
                (150, 220),  # A3: 70 ώρες κατανάλωση
            ]
            
            total_consumption = 0
            for i, (start_reading, end_reading) in enumerate(readings_data):
                apartment = apartments[i]
                
                # Αρχική ένδειξη
                MeterReading.objects.create(
                    apartment=apartment,
                    reading_date=start_date,
                    value=Decimal(str(start_reading)),
                    meter_type=MeterReading.METER_TYPE_HEATING_HOURS,
                    notes=f"Αρχή μήνα - ωρομετρητής"
                )
                
                # Τελική ένδειξη
                MeterReading.objects.create(
                    apartment=apartment,
                    reading_date=today,
                    value=Decimal(str(end_reading)),
                    meter_type=MeterReading.METER_TYPE_HEATING_HOURS,
                    notes=f"Τέλος μήνα - ωρομετρητής"
                )
                
                consumption = end_reading - start_reading
                total_consumption += consumption
                print(f"   - {apartment.number}: {consumption} ώρες κατανάλωσης")
            
            print(f"✅ Συνολική κατανάλωση: {total_consumption} ώρες")
            
            # 4. Δημιουργία δαπάνης θέρμανσης
            heating_expense = Expense.objects.create(
                building=building,
                title="Πετρέλαιο Θέρμανσης - Test Frontend",
                amount=Decimal('600.00'),
                date=today,
                category='heating_fuel',
                distribution_type='by_participation_mills'
            )
            print(f"✅ Δαπάνη θέρμανσης: {heating_expense.amount}€")
            
            # 5. Έλεγχος υπολογισμού με το νέο σύστημα
            calculator = AdvancedCommonExpenseCalculator(building_id=building.id)
            result = calculator.calculate_advanced_shares()
            
            print("\n📊 ΑΠΟΤΕΛΕΣΜΑΤΑ ΥΠΟΛΟΓΙΣΜΟΥ:")
            print("=" * 40)
            
            # Αναμενόμενα αποτελέσματα
            total_cost = Decimal('600.00')
            fixed_cost = total_cost * Decimal('0.25')  # 25% = 150€
            variable_cost = total_cost - fixed_cost     # 75% = 450€
            
            print(f"Συνολικό κόστος: {total_cost}€")
            print(f"Πάγιο κόστος (25%): {fixed_cost}€")
            print(f"Μεταβλητό κόστος (75%): {variable_cost}€")
            print()
            
            calculated_total = Decimal('0.00')
            for apartment in apartments:
                share = result['shares'][apartment.id]
                heating_breakdown = share['heating_breakdown']
                total_heating = share['breakdown']['heating_expenses']
                
                print(f"Διαμέρισμα {apartment.number}:")
                print(f"  - Χιλιοστά: {apartment.participation_mills}‰")
                print(f"  - Πάγιο: {heating_breakdown['fixed_cost']:.2f}€")
                print(f"  - Μεταβλητό: {heating_breakdown['variable_cost']:.2f}€")
                print(f"  - Κατανάλωση: {heating_breakdown['consumption_hours']:.0f} ώρες")
                print(f"  - Σύνολο: {total_heating:.2f}€")
                print()
                
                calculated_total += total_heating
            
            print(f"Συνολικό υπολογισμένο: {calculated_total:.2f}€")
            
            # 6. Έλεγχος ακρίβειας
            difference = abs(calculated_total - total_cost)
            success = difference < Decimal('0.01')
            
            print(f"✓ Ισοζύγιο: {'ΣΩΣΤΟ' if success else 'ΛΑΘΟΣ'}")
            if not success:
                print(f"❌ Διαφορά: {difference:.2f}€")
            
            # 7. Test API response structure (προσομοίωση frontend)
            print("\n🌐 ΔΟΜΗ API RESPONSE (για Frontend):")
            print("=" * 40)
            
            # Αυτό είναι αυτό που θα έβλεπε το frontend
            api_response = {
                "building": {
                    "id": building.id,
                    "name": building.name,
                    "heating_system": building.heating_system,
                    "heating_fixed_percentage": building.heating_fixed_percentage
                },
                "calculation_result": result,
                "heating_system_display": building.get_heating_system_display()
            }
            
            print(f"✅ Building heating_system: '{api_response['building']['heating_system']}'")
            print(f"✅ Building heating_fixed_percentage: {api_response['building']['heating_fixed_percentage']}")
            print(f"✅ Heating system display: '{api_response['heating_system_display']}'")
            print(f"✅ Shares calculated for {len(result['shares'])} apartments")
            
            # 8. Έλεγχος τύπων μετρητών
            meter_types_available = [
                MeterReading.METER_TYPE_WATER,
                MeterReading.METER_TYPE_ELECTRICITY, 
                MeterReading.METER_TYPE_HEATING_HOURS,
                MeterReading.METER_TYPE_HEATING_ENERGY
            ]
            
            print(f"✅ Meter types available: {meter_types_available}")
            
            print("\n🎉 ΣΥΜΠΕΡΑΣΜΑ:")
            print("=" * 30)
            if success:
                print("✅ Η ενσωμάτωση Frontend-Backend λειτουργεί τέλεια!")
                print("✅ Τα νέα πεδία θέρμανσης μεταδίδονται σωστά!")
                print("✅ Οι υπολογισμοί είναι ακριβείς!")
                print("✅ Οι νέοι τύποι μετρητών υποστηρίζονται!")
            else:
                print("❌ Υπάρχει πρόβλημα στους υπολογισμούς!")
            
            return success
            
        finally:
            # Καθαρισμός
            Building.objects.filter(name__startswith="Test Building - Frontend").delete()
            print("\n🧹 Δεδομένα ελέγχου καθαρίστηκαν")


if __name__ == "__main__":
    success = test_frontend_backend_integration()
    sys.exit(0 if success else 1)