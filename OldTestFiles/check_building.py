#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from residents.models import Resident
from financial.models import Expense, ApartmentShare

def check_building():
    print("🔍 Ελέγχος Δεδομένων Κτιρίου 'Αλκμάνος 22'")
    print("=" * 60)
    
    # Βρες το κτίριο
    building = Building.objects.filter(address__icontains="Αλκμάνος").first()
    
    if not building:
        print("❌ Δεν βρέθηκε κτίριο με 'Αλκμάνος' στη διεύθυνση")
        return
    
    print(f"✅ Βρέθηκε κτίριο: {building.name}")
    print(f"   Διεύθυνση: {building.address}")
    print()
    
    # Βρες όλα τα διαμερίσματα
    apartments = Apartment.objects.filter(building=building).order_by('name')
    
    print("📊 ΔΕΔΟΜΕΝΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
    print("-" * 60)
    
    total_mills = 0
    total_common = 0
    total_heating = 0
    total_electricity = 0
    
    for apt in apartments:
        # Κύριο κάτοικος
        resident = Resident.objects.filter(apartment=apt, is_main_resident=True).first()
        resident_name = resident.full_name if resident else "Δεν έχει κατοίκους"
        
        # Χιλιοστά συμμετοχής
        mills = apt.participation_mills if hasattr(apt, 'participation_mills') else 0
        
        # Κοινόχρηστα - θα ελέγξουμε τις δαπάνες
        expenses = Expense.objects.filter(building=building, is_issued=False)
        
        # Υπολογισμός κοινόχρηστων ανά διαμέρισμα
        apartment_common = 0
        apartment_heating = 0
        apartment_electricity = 0
        
        for expense in expenses:
            if expense.distribution_type == 'by_participation_mills':
                total_building_mills = sum(a.participation_mills for a in apartments if hasattr(a, 'participation_mills'))
                if total_building_mills > 0:
                    share = (expense.amount * mills) / total_building_mills
                    
                    if 'heating' in expense.category.lower():
                        apartment_heating += share
                    elif 'elevator' in expense.category.lower():
                        apartment_electricity += share
                    else:
                        apartment_common += share
        
        print(f"{apt.name}: {resident_name} - Χιλιοστά: {mills}, Κοινόχρηστα: {apartment_common:.2f}, Θέρμανση: {apartment_heating:.2f}, Ανελκύστρα: {apartment_electricity:.2f}")
        
        total_mills += mills
        total_common += apartment_common
        total_heating += apartment_heating
        total_electricity += apartment_electricity
    
    print("-" * 60)
    print(f"ΣΥΝΟΛΑ: Χιλιοστά: {total_mills}, Κοινόχρηστα: {total_common:.2f}, Θέρμανση: {total_heating:.2f}, Ανελκύστρα: {total_electricity:.2f}")
    print()
    
    # Σύγκριση με τα δεδομένα που παρείχες
    print("🔍 ΣΥΓΚΡΙΣΗ ΜΕ ΤΑ ΠΑΡΕΙΧΘΕΝΤΑ ΔΕΔΟΜΕΝΑ:")
    print("=" * 50)
    
    expected_mills = 1000.00
    expected_common = 230.00
    expected_heating = 1500.00
    expected_electricity = 0.00
    
    print(f"Αναμενόμενα χιλιοστά: {expected_mills} | Πραγματικά: {total_mills} | {'✅' if abs(total_mills - expected_mills) < 0.01 else '❌'}")
    print(f"Αναμενόμενα κοινόχρηστα: {expected_common} | Πραγματικά: {total_common:.2f} | {'✅' if abs(total_common - expected_common) < 0.01 else '❌'}")
    print(f"Αναμενόμενη θέρμανση: {expected_heating} | Πραγματικά: {total_heating:.2f} | {'✅' if abs(total_heating - expected_heating) < 0.01 else '❌'}")
    print(f"Αναμενόμενη ανελκύστρα: {expected_electricity} | Πραγματικά: {total_electricity:.2f} | {'✅' if abs(total_electricity - expected_electricity) < 0.01 else '❌'}")

if __name__ == "__main__":
    check_building()
