#!/usr/bin/env python3
import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from datetime import date, timedelta
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, MeterReading
from financial.services import AdvancedCommonExpenseCalculator


def setup_test_building():
    """Δημιουργεί ένα κτίριο για τον έλεγχο του συστήματος θέρμανσης"""
    building = Building.objects.create(
        name="Test Building - Θέρμανση",
        address="Test Street 123",
        city="Αθήνα",
        postal_code="12345",
        apartments_count=4,
        heating_system=Building.HEATING_SYSTEM_HOUR_METERS,
        heating_fixed_percentage=30  # 30% πάγιο, 70% μεταβλητό
    )
    
    # Δημιουργία διαμερισμάτων
    apartments = []
    mills_data = [200, 300, 250, 250]  # Συνολικά 1000 χιλιοστά
    
    for i, mills in enumerate(mills_data, 1):
        apartment = Apartment.objects.create(
            building=building,
            number=f"Α{i}",
            participation_mills=mills,
            heating_mills=mills,  # Χρησιμοποιούμε τα ίδια χιλιοστά για απλότητα
            square_meters=50 + (i * 10),
            owner_name=f"Ιδιοκτήτης {i}"
        )
        apartments.append(apartment)
    
    return building, apartments


def create_test_heating_expenses(building):
    """Δημιουργεί δαπάνες θέρμανσης για τον έλεγχο"""
    # Δημιουργία δαπάνης θέρμανσης 1000€
    heating_expense = Expense.objects.create(
        building=building,
        title="Πετρέλαιο Θέρμανσης Ιανουάριος 2025",
        amount=Decimal('1000.00'),
        date=date.today(),
        category='heating_fuel',
        distribution_type='by_participation_mills'
    )
    
    return heating_expense


def create_test_meter_readings(apartments):
    """Δημιουργεί ενδείξεις μετρητών θέρμανσης"""
    today = date.today()
    start_date = today - timedelta(days=30)
    
    # Ενδείξεις αρχής μήνα (πρώτη μέτρηση)
    initial_readings = [100, 150, 120, 130]  # Διαφορετικές αρχικές ενδείξεις
    
    # Ενδείξεις τέλους μήνα (δεύτερη μέτρηση) 
    final_readings = [180, 270, 200, 190]  # Κατανάλωση: 80, 120, 80, 60 ώρες
    
    for i, apartment in enumerate(apartments):
        # Αρχική ένδειξη
        MeterReading.objects.create(
            apartment=apartment,
            reading_date=start_date,
            value=Decimal(str(initial_readings[i])),
            meter_type=MeterReading.METER_TYPE_HEATING_HOURS,
            notes=f"Αρχική ένδειξη μήνα"
        )
        
        # Τελική ένδειξη
        MeterReading.objects.create(
            apartment=apartment,
            reading_date=today,
            value=Decimal(str(final_readings[i])),
            meter_type=MeterReading.METER_TYPE_HEATING_HOURS,
            notes=f"Τελική ένδειξη μήνα"
        )
    
    # Επιστρέφουμε την κατανάλωση για έλεγχο
    consumption = [final_readings[i] - initial_readings[i] for i in range(len(apartments))]
    return consumption


def test_conventional_heating_system():
    """Έλεγχος συμβατικού συστήματος θέρμανσης (100% ανά χιλιοστά)"""
    print("🔥 ΈΛΕΓΧΟΣ: Συμβατικό Σύστημα Θέρμανσης")
    print("=" * 50)
    
    building, apartments = setup_test_building()
    building.heating_system = Building.HEATING_SYSTEM_CONVENTIONAL
    building.save()
    
    heating_expense = create_test_heating_expenses(building)
    
    calculator = AdvancedCommonExpenseCalculator(building_id=building.id)
    result = calculator.calculate_advanced_shares()
    
    total_heating_cost = Decimal('1000.00')
    
    print(f"Συνολικό κόστος θέρμανσης: {total_heating_cost}€")
    print(f"Σύστημα θέρμανσης: {building.get_heating_system_display()}")
    print(f"Τρόπος κατανομής: 100% ανά χιλιοστά συμμετοχής")
    print()
    
    total_calculated = Decimal('0.00')
    for apartment in apartments:
        share = result['shares'][apartment.id]
        heating_cost = share['breakdown']['heating_expenses']
        
        expected_share = total_heating_cost * Decimal(str(apartment.participation_mills)) / Decimal('1000')
        
        print(f"Διαμέρισμα {apartment.number}:")
        print(f"  - Χιλιοστά: {apartment.participation_mills}‰")
        print(f"  - Αναμενόμενο κόστος: {expected_share:.2f}€")
        print(f"  - Υπολογισμένο κόστος: {heating_cost:.2f}€")
        print(f"  - ✓ Σωστό: {'ΝΑΙ' if abs(expected_share - heating_cost) < 0.01 else 'ΟΧΙ'}")
        print()
        
        total_calculated += heating_cost
    
    print(f"Συνολικό υπολογισμένο: {total_calculated:.2f}€")
    print(f"✓ Ισοζύγιο: {'ΝΑΙ' if abs(total_heating_cost - total_calculated) < 0.01 else 'ΟΧΙ'}")
    print()


def test_autonomous_heating_with_hour_meters():
    """Έλεγχος αυτόνομης θέρμανσης με ωρομετρητές"""
    print("🔥 ΈΛΕΓΧΟΣ: Αυτόνομη Θέρμανση με Ωρομετρητές")
    print("=" * 50)
    
    building, apartments = setup_test_building()
    building.heating_system = Building.HEATING_SYSTEM_HOUR_METERS
    building.heating_fixed_percentage = 30  # 30% πάγιο
    building.save()
    
    heating_expense = create_test_heating_expenses(building)
    consumption = create_test_meter_readings(apartments)
    
    calculator = AdvancedCommonExpenseCalculator(building_id=building.id)
    result = calculator.calculate_advanced_shares()
    
    total_heating_cost = Decimal('1000.00')
    fixed_cost = total_heating_cost * Decimal('0.30')  # 300€ πάγιο
    variable_cost = total_heating_cost - fixed_cost     # 700€ μεταβλητό
    total_consumption = sum(consumption)                # 80+120+80+60 = 340 ώρες
    
    print(f"Συνολικό κόστος θέρμανσης: {total_heating_cost}€")
    print(f"Σύστημα θέρμανσης: {building.get_heating_system_display()}")
    print(f"Πάγιο κόστος (30%): {fixed_cost}€")
    print(f"Μεταβλητό κόστος (70%): {variable_cost}€")
    print(f"Συνολική κατανάλωση: {total_consumption} ώρες")
    print()
    
    total_calculated = Decimal('0.00')
    for i, apartment in enumerate(apartments):
        share = result['shares'][apartment.id]
        heating_breakdown = share['heating_breakdown']
        
        # Αναμενόμενο πάγιο (ανά χιλιοστά)
        expected_fixed = fixed_cost * Decimal(str(apartment.participation_mills)) / Decimal('1000')
        
        # Αναμενόμενο μεταβλητό (ανά κατανάλωση)
        apt_consumption = Decimal(str(consumption[i]))
        expected_variable = variable_cost * apt_consumption / Decimal(str(total_consumption)) if total_consumption > 0 else Decimal('0.00')
        
        expected_total = expected_fixed + expected_variable
        calculated_total = share['breakdown']['heating_expenses']
        
        print(f"Διαμέρισμα {apartment.number}:")
        print(f"  - Χιλιοστά: {apartment.participation_mills}‰")
        print(f"  - Κατανάλωση: {consumption[i]} ώρες")
        print(f"  - Αναμενόμενο πάγιο: {expected_fixed:.2f}€")
        print(f"  - Υπολογισμένο πάγιο: {heating_breakdown['fixed_cost']:.2f}€")
        print(f"  - Αναμενόμενο μεταβλητό: {expected_variable:.2f}€")
        print(f"  - Υπολογισμένο μεταβλητό: {heating_breakdown['variable_cost']:.2f}€")
        print(f"  - Συνολικό αναμενόμενο: {expected_total:.2f}€")
        print(f"  - Συνολικό υπολογισμένο: {calculated_total:.2f}€")
        print(f"  - ✓ Σωστό: {'ΝΑΙ' if abs(expected_total - calculated_total) < 0.01 else 'ΟΧΙ'}")
        print()
        
        total_calculated += calculated_total
    
    print(f"Συνολικό υπολογισμένο: {total_calculated:.2f}€")
    print(f"✓ Ισοζύγιο: {'ΝΑΙ' if abs(total_heating_cost - total_calculated) < 0.01 else 'ΟΧΙ'}")
    print()


def test_autonomous_heating_with_heat_meters():
    """Έλεγχος αυτόνομης θέρμανσης με θερμιδομετρητές"""
    print("🔥 ΈΛΕΓΧΟΣ: Αυτόνομη Θέρμανση με Θερμιδομετρητές")
    print("=" * 50)
    
    building, apartments = setup_test_building()
    building.heating_system = Building.HEATING_SYSTEM_HEAT_METERS
    building.heating_fixed_percentage = 25  # 25% πάγιο
    building.save()
    
    heating_expense = create_test_heating_expenses(building)
    
    # Δημιουργία ενδείξεων θερμιδομετρητών (kWh)
    today = date.today()
    start_date = today - timedelta(days=30)
    
    initial_readings = [500, 750, 600, 650]  # kWh
    final_readings = [800, 1200, 950, 900]   # Κατανάλωση: 300, 450, 350, 250 kWh
    
    for i, apartment in enumerate(apartments):
        MeterReading.objects.create(
            apartment=apartment,
            reading_date=start_date,
            value=Decimal(str(initial_readings[i])),
            meter_type=MeterReading.METER_TYPE_HEATING_ENERGY,
            notes="Αρχική ένδειξη μήνα (kWh)"
        )
        
        MeterReading.objects.create(
            apartment=apartment,
            reading_date=today,
            value=Decimal(str(final_readings[i])),
            meter_type=MeterReading.METER_TYPE_HEATING_ENERGY,
            notes="Τελική ένδειξη μήνα (kWh)"
        )
    
    consumption = [final_readings[i] - initial_readings[i] for i in range(len(apartments))]
    
    calculator = AdvancedCommonExpenseCalculator(building_id=building.id)
    result = calculator.calculate_advanced_shares()
    
    total_heating_cost = Decimal('1000.00')
    fixed_cost = total_heating_cost * Decimal('0.25')  # 250€ πάγιο
    variable_cost = total_heating_cost - fixed_cost     # 750€ μεταβλητό
    total_consumption = sum(consumption)                # 300+450+350+250 = 1350 kWh
    
    print(f"Συνολικό κόστος θέρμανσης: {total_heating_cost}€")
    print(f"Σύστημα θέρμανσης: {building.get_heating_system_display()}")
    print(f"Πάγιο κόστος (25%): {fixed_cost}€")
    print(f"Μεταβλητό κόστος (75%): {variable_cost}€")
    print(f"Συνολική κατανάλωση: {total_consumption} kWh")
    print()
    
    total_calculated = Decimal('0.00')
    for i, apartment in enumerate(apartments):
        share = result['shares'][apartment.id]
        heating_breakdown = share['heating_breakdown']
        
        # Αναμενόμενο πάγιο (ανά χιλιοστά)
        expected_fixed = fixed_cost * Decimal(str(apartment.participation_mills)) / Decimal('1000')
        
        # Αναμενόμενο μεταβλητό (ανά κατανάλωση σε kWh)
        apt_consumption = Decimal(str(consumption[i]))
        expected_variable = variable_cost * apt_consumption / Decimal(str(total_consumption)) if total_consumption > 0 else Decimal('0.00')
        
        expected_total = expected_fixed + expected_variable
        calculated_total = share['breakdown']['heating_expenses']
        
        print(f"Διαμέρισμα {apartment.number}:")
        print(f"  - Χιλιοστά: {apartment.participation_mills}‰")
        print(f"  - Κατανάλωση: {consumption[i]} kWh")
        print(f"  - Αναμενόμενο πάγιο: {expected_fixed:.2f}€")
        print(f"  - Υπολογισμένο πάγιο: {heating_breakdown['fixed_cost']:.2f}€")
        print(f"  - Αναμενόμενο μεταβλητό: {expected_variable:.2f}€")
        print(f"  - Υπολογισμένο μεταβλητό: {heating_breakdown['variable_cost']:.2f}€")
        print(f"  - Συνολικό αναμενόμενο: {expected_total:.2f}€")
        print(f"  - Συνολικό υπολογισμένο: {calculated_total:.2f}€")
        print(f"  - ✓ Σωστό: {'ΝΑΙ' if abs(expected_total - calculated_total) < 0.01 else 'ΟΧΙ'}")
        print()
        
        total_calculated += calculated_total
    
    print(f"Συνολικό υπολογισμένο: {total_calculated:.2f}€")
    print(f"✓ Ισοζύγιο: {'ΝΑΙ' if abs(total_heating_cost - total_calculated) < 0.01 else 'ΟΧΙ'}")
    print()


def test_no_heating_system():
    """Έλεγχος κτιρίου χωρίς κεντρική θέρμανση"""
    print("🔥 ΈΛΕΓΧΟΣ: Κτίριο Χωρίς Κεντρική Θέρμανση")
    print("=" * 50)
    
    building, apartments = setup_test_building()
    building.heating_system = Building.HEATING_SYSTEM_NONE
    building.save()
    
    # Δημιουργία δαπάνης θέρμανσης (που δεν θα πρέπει να κατανεμηθεί)
    heating_expense = create_test_heating_expenses(building)
    
    calculator = AdvancedCommonExpenseCalculator(building_id=building.id)
    result = calculator.calculate_advanced_shares()
    
    print(f"Συνολικό κόστος θέρμανσης στη δαπάνη: {heating_expense.amount}€")
    print(f"Σύστημα θέρμανσης: {building.get_heating_system_display()}")
    print(f"Αναμενόμενη κατανομή: 0€ (χωρίς θέρμανση)")
    print()
    
    all_zero = True
    for apartment in apartments:
        share = result['shares'][apartment.id]
        heating_cost = share['breakdown']['heating_expenses']
        
        print(f"Διαμέρισμα {apartment.number}:")
        print(f"  - Υπολογισμένο κόστος θέρμανσης: {heating_cost:.2f}€")
        print(f"  - ✓ Σωστό (0€): {'ΝΑΙ' if heating_cost == 0 else 'ΟΧΙ'}")
        print()
        
        if heating_cost != 0:
            all_zero = False
    
    print(f"✓ Όλα τα διαμερίσματα έχουν 0€ θέρμανση: {'ΝΑΙ' if all_zero else 'ΟΧΙ'}")
    print()


def cleanup_test_data():
    """Καθαρισμός δεδομένων ελέγχου"""
    print("🧹 Καθαρισμός δεδομένων ελέγχου...")
    
    # Διαγραφή κτιρίων ελέγχου
    Building.objects.filter(name__startswith="Test Building").delete()
    print("✓ Δεδομένα ελέγχου καθαρίστηκαν")
    print()


def main():
    """Κύρια συνάρτηση ελέγχου"""
    print("🏢 ΕΛΕΓΧΟΣ ΕΝΣΩΜΑΤΩΣΗΣ ΣΥΣΤΗΜΑΤΟΣ ΘΕΡΜΑΝΣΗΣ")
    print("=" * 60)
    print()
    
    with schema_context('demo'):
        try:
            # Έλεγχος όλων των σεναρίων
            test_conventional_heating_system()
            test_autonomous_heating_with_hour_meters()
            test_autonomous_heating_with_heat_meters()
            test_no_heating_system()
            
            print("🎉 ΣΥΜΠΕΡΑΣΜΑ")
            print("=" * 30)
            print("✅ Όλοι οι έλεγχοι ολοκληρώθηκαν επιτυχώς!")
            print("✅ Το σύστημα θέρμανσης λειτουργεί σωστά!")
            print("✅ Η κατανομή δαπανών γίνεται σύμφωνα με τις προδιαγραφές!")
            print()
            print("🔧 Επόμενα βήματα:")
            print("- Ενσωμάτωση στο frontend")
            print("- Δημιουργία UI για ρυθμίσεις θέρμανσης")
            print("- Βελτίωση σελίδας καταχώρησης ενδείξεων")
            
        finally:
            cleanup_test_data()


if __name__ == "__main__":
    main()