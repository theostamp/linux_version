#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from residents.models import Resident
from financial.models import Expense

def check_demo_building():
    print("🔍 Έλεγχος Δεδομένων Demo Tenant")
    print("=" * 50)
    
    # Βρες το demo client
    demo_client = Client.objects.filter(schema_name='demo').first()
    
    if not demo_client:
        print("❌ Δεν βρέθηκε demo client")
        return
    
    print(f"✅ Βρέθηκε demo client: {demo_client.name}")
    print()
    
    # Εκτέλεση στο demo tenant context
    with tenant_context(demo_client):
        print("🏢 ΚΤΙΡΙΑ ΣΤΟ DEMO TENANT:")
        print("-" * 30)
        
        buildings = Building.objects.all()
        print(f"Βρέθηκαν {buildings.count()} κτίρια:")
        
        for building in buildings:
            print(f"   📍 {building.name} - {building.address}")
            
            # Βρες διαμερίσματα για αυτό το κτίριο
            apartments = Apartment.objects.filter(building=building).order_by('number')
            print(f"      Διαμερίσματα ({apartments.count()}): {', '.join([apt.number for apt in apartments])}")
            
            # Έλεγχος αν είναι το κτίριο που ψάχνουμε
            if "Αλκμάνος" in building.address:
                print(f"\n🎯 ΒΡΕΘΗΚΕ ΤΟ ΚΤΙΡΙΟ: {building.name}")
                print(f"   Διεύθυνση: {building.address}")
                print(f"   ID: {building.id}")
                
                # Λεπτομερής έλεγχος διαμερισμάτων
                print(f"\n📊 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
                print("-" * 50)
                
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
                    
                    # Κοινόχρηστα - υπολογισμός από δαπάνες
                    expenses = Expense.objects.filter(building=building, is_issued=False)
                    
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
                    
                    print(f"   {apt.number}: {resident_name}")
                    print(f"      Χιλιοστά: {mills}")
                    print(f"      Κοινόχρηστα: {apartment_common:.2f}")
                    print(f"      Θέρμανση: {apartment_heating:.2f}")
                    print(f"      Ανελκύστρα: {apartment_electricity:.2f}")
                    print()
                    
                    total_mills += mills
                    total_common += apartment_common
                    total_heating += apartment_heating
                    total_electricity += apartment_electricity
                
                print("📋 ΣΥΝΟΛΑ:")
                print(f"   Χιλιοστά: {total_mills}")
                print(f"   Κοινόχρηστα: {total_common:.2f}")
                print(f"   Θέρμανση: {total_heating:.2f}")
                print(f"   Ανελκύστρα: {total_electricity:.2f}")
                
                # Σύγκριση με τα δεδομένα που παρείχες
                print(f"\n🔍 ΣΥΓΚΡΙΣΗ ΜΕ ΤΑ ΠΑΡΕΙΧΘΕΝΤΑ ΔΕΔΟΜΕΝΑ:")
                print("=" * 50)
                
                expected_mills = 1000.00
                expected_common = 230.00
                expected_heating = 1500.00
                expected_electricity = 0.00
                
                print(f"Αναμενόμενα χιλιοστά: {expected_mills} | Πραγματικά: {total_mills} | {'✅' if abs(total_mills - expected_mills) < 0.01 else '❌'}")
                print(f"Αναμενόμενα κοινόχρηστα: {expected_common} | Πραγματικά: {total_common:.2f} | {'✅' if abs(total_common - expected_common) < 0.01 else '❌'}")
                print(f"Αναμενόμενη θέρμανση: {expected_heating} | Πραγματικά: {total_heating:.2f} | {'✅' if abs(total_heating - expected_heating) < 0.01 else '❌'}")
                print(f"Αναμενόμενη ανελκύστρα: {expected_electricity} | Πραγματικά: {total_electricity:.2f} | {'✅' if abs(total_electricity - expected_electricity) < 0.01 else '❌'}")
                
                break
        else:
            print("❌ Δεν βρέθηκε κτίριο με 'Αλκμάνος' στη διεύθυνση")

if __name__ == "__main__":
    check_demo_building()
