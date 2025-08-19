#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from residents.models import Resident
from financial.models import CommonExpense, ApartmentAllocation

def verify_building_data():
    """Verify the data for building 'Αλκμάνος 22, Αθήνα 115 28'"""
    
    # Find the building
    building = Building.objects.filter(
        address__icontains="Αλκμάνος 22"
    ).first()
    
    if not building:
        print("❌ Building 'Αλκμάνος 22, Αθήνα 115 28' not found!")
        return
    
    print(f"✅ Found building: {building.name} - {building.address}")
    print(f"   Building ID: {building.id}")
    print()
    
    # Get all apartments for this building
    apartments = Apartment.objects.filter(building=building).order_by('name')
    
    print("📊 APARTMENT DATA VERIFICATION:")
    print("=" * 80)
    print(f"{'A/A':<4} {'ΟΝΟΜΑΤΕΠΩΝΥΜΟ':<25} {'ΧΙΛΙΟΣΤΑ':<10} {'ΚΟΙΝΟΧΡΗΣΤΑ':<12} {'ΑΝΕΛΚΥΡΑΣ':<10} {'ΘΕΡΜΑΝΣΗ':<10}")
    print("-" * 80)
    
    total_mills = 0
    total_common_expenses = 0
    total_heating = 0
    total_electricity = 0
    
    for i, apartment in enumerate(apartments, 1):
        # Get the main resident
        resident = Resident.objects.filter(apartment=apartment, is_main_resident=True).first()
        resident_name = resident.full_name if resident else "Δεν έχει κατοίκους"
        
        # Get allocation data
        allocation = ApartmentAllocation.objects.filter(apartment=apartment).first()
        mills = allocation.mills if allocation else 0
        
        # Get common expenses for this apartment
        common_expense = CommonExpense.objects.filter(apartment=apartment).first()
        common_amount = common_expense.amount if common_expense else 0
        heating_amount = common_expense.heating_amount if common_expense else 0
        electricity_amount = common_expense.electricity_amount if common_expense else 0
        
        print(f"{i:<4} {resident_name:<25} {mills:<10.2f} {common_amount:<12.2f} {electricity_amount:<10.2f} {heating_amount:<10.2f}")
        
        total_mills += mills
        total_common_expenses += common_amount
        total_heating += heating_amount
        total_electricity += electricity_amount
    
    print("-" * 80)
    print(f"{'ΣΥΝΟΛΑ':<29} {total_mills:<10.2f} {total_common_expenses:<12.2f} {total_electricity:<10.2f} {total_heating:<10.2f}")
    print()
    
    # Compare with provided data
    print("🔍 COMPARISON WITH PROVIDED DATA:")
    print("=" * 50)
    
    expected_data = {
        'A1': {'name': 'Γεώργιος Παπαδόπουλος', 'mills': 95.00, 'common': 26.85, 'electricity': 0.00, 'heating': 142.50},
        'A2': {'name': 'Ελένη Δημητρίου', 'mills': 102.00, 'common': 28.46, 'electricity': 0.00, 'heating': 153.00},
        'A3': {'name': 'Νικόλαος Αλεξίου', 'mills': 88.00, 'common': 25.24, 'electricity': 0.00, 'heating': 132.00},
        'B1': {'name': 'Αικατερίνη Σταματίου', 'mills': 110.00, 'common': 30.30, 'electricity': 0.00, 'heating': 165.00},
        'B2': {'name': 'Δημήτριος Κωνσταντίνου', 'mills': 105.00, 'common': 29.15, 'electricity': 0.00, 'heating': 157.50},
        'B3': {'name': 'Ιωάννης Μιχαηλίδης', 'mills': 98.00, 'common': 27.54, 'electricity': 0.00, 'heating': 147.00},
        'G1': {'name': 'Αννα Παπαδοπούλου', 'mills': 92.00, 'common': 26.16, 'electricity': 0.00, 'heating': 138.00},
        'G2': {'name': 'Παναγιώτης Αντωνίου', 'mills': 115.00, 'common': 31.45, 'electricity': 0.00, 'heating': 172.50},
        'D1': {'name': 'Ευαγγελία Κωνσταντίνου', 'mills': 108.00, 'common': 29.84, 'electricity': 0.00, 'heating': 162.00},
        'D2': {'name': 'Μιχαήλ Γεωργίου', 'mills': 87.00, 'common': 25.01, 'electricity': 0.00, 'heating': 130.50}
    }
    
    expected_total_mills = 1000.00
    expected_total_common = 230.00
    expected_total_electricity = 0.00
    expected_total_heating = 1500.00
    
    print(f"Expected total mills: {expected_total_mills}")
    print(f"Actual total mills: {total_mills}")
    print(f"Match: {'✅' if abs(total_mills - expected_total_mills) < 0.01 else '❌'}")
    print()
    print(f"Expected total common expenses: {expected_total_common}")
    print(f"Actual total common expenses: {total_common_expenses}")
    print(f"Match: {'✅' if abs(total_common_expenses - expected_total_common) < 0.01 else '❌'}")
    print()
    print(f"Expected total heating: {expected_total_heating}")
    print(f"Actual total heating: {total_heating}")
    print(f"Match: {'✅' if abs(total_heating - expected_total_heating) < 0.01 else '❌'}")
    print()
    
    # Check individual apartments
    print("📋 INDIVIDUAL APARTMENT VERIFICATION:")
    print("=" * 50)
    
    for apartment in apartments:
        apartment_name = apartment.name
        if apartment_name in expected_data:
            expected = expected_data[apartment_name]
            
            # Get actual data
            allocation = ApartmentAllocation.objects.filter(apartment=apartment).first()
            actual_mills = allocation.mills if allocation else 0
            
            common_expense = CommonExpense.objects.filter(apartment=apartment).first()
            actual_common = common_expense.amount if common_expense else 0
            actual_heating = common_expense.heating_amount if common_expense else 0
            actual_electricity = common_expense.electricity_amount if common_expense else 0
            
            print(f"Apartment {apartment_name}:")
            print(f"  Mills: {actual_mills} (expected: {expected['mills']}) {'✅' if abs(actual_mills - expected['mills']) < 0.01 else '❌'}")
            print(f"  Common: {actual_common} (expected: {expected['common']}) {'✅' if abs(actual_common - expected['common']) < 0.01 else '❌'}")
            print(f"  Heating: {actual_heating} (expected: {expected['heating']}) {'✅' if abs(actual_heating - expected['heating']) < 0.01 else '❌'}")
            print()

if __name__ == "__main__":
    verify_building_data()
