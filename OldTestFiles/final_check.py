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

def final_check():
    print("🔍 ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ - ΑΛΚΜΑΝΟΣ 22")
    print("=" * 60)
    
    # Βρες το demo client
    demo_client = Client.objects.filter(schema_name='demo').first()
    
    if not demo_client:
        print("❌ Δεν βρέθηκε demo client")
        return
    
    print(f"✅ Βρέθηκε demo client: {demo_client.name}")
    print()
    
    # Εκτέλεση στο demo tenant context
    with tenant_context(demo_client):
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.filter(address__icontains="Αλκμάνος").first()
        
        if not building:
            print("❌ Δεν βρέθηκε κτίριο με 'Αλκμάνος' στη διεύθυνση")
            return
        
        print(f"🎯 ΒΡΕΘΗΚΕ ΚΤΙΡΙΟ: {building.name}")
        print(f"   Διεύθυνση: {building.address}")
        print(f"   ID: {building.id}")
        print()
        
        # Βρες διαμερίσματα
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"📊 ΔΙΑΜΕΡΙΣΜΑΤΑ ({apartments.count()}):")
        print("-" * 40)
        
        total_mills = 0
        
        for apt in apartments:
            mills = apt.participation_mills if hasattr(apt, 'participation_mills') else 0
            total_mills += mills
            
            # Βρες κάτοικους για αυτό το διαμέρισμα
            residents = Resident.objects.filter(apartment=apt.number, building=building)
            resident_names = [f"{r.user.get_full_name()} ({r.get_role_display()})" for r in residents]
            resident_info = ", ".join(resident_names) if resident_names else "Δεν έχει κατοίκους"
            
            print(f"   {apt.number}: {resident_info}")
            print(f"      Χιλιοστά: {mills}")
            print(f"      Τετραγωνικά: {apt.square_meters if hasattr(apt, 'square_meters') else 'N/A'}")
            print()
        
        print("📋 ΣΥΝΟΛΑ:")
        print(f"   Συνολικά χιλιοστά: {total_mills}")
        print()
        
        # Έλεγχος δαπανών
        expenses = Expense.objects.filter(building=building, is_issued=False)
        print("💰 ΔΑΠΑΝΕΣ ΚΤΙΡΙΟΥ (μη εκδομένες):")
        print("-" * 40)
        
        total_expenses = 0
        heating_expenses = 0
        elevator_expenses = 0
        other_expenses = 0
        
        for expense in expenses:
            total_expenses += expense.amount
            
            if 'heating' in expense.category.lower():
                heating_expenses += expense.amount
            elif 'elevator' in expense.category.lower():
                elevator_expenses += expense.amount
            else:
                other_expenses += expense.amount
            
            print(f"   {expense.title}: {expense.amount}€ ({expense.get_category_display()})")
        
        print()
        print("📋 ΣΥΝΟΛΑ ΔΑΠΑΝΩΝ:")
        print(f"   Συνολικές δαπάνες: {total_expenses}€")
        print(f"   Δαπάνες θέρμανσης: {heating_expenses}€")
        print(f"   Δαπάνες ανελκυστήρα: {elevator_expenses}€")
        print(f"   Άλλες δαπάνες: {other_expenses}€")
        print()
        
        # Υπολογισμός μεριδίων ανά διαμέρισμα
        print("🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΜΕΡΙΔΙΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 50)
        
        for apt in apartments:
            mills = apt.participation_mills if hasattr(apt, 'participation_mills') else 0
            
            if total_mills > 0:
                # Υπολογισμός μεριδίων
                common_share = (other_expenses * mills) / total_mills
                heating_share = (heating_expenses * mills) / total_mills
                elevator_share = (elevator_expenses * mills) / total_mills
                total_share = common_share + heating_share + elevator_share
                
                print(f"   {apt.number}:")
                print(f"      Κοινόχρηστα: {common_share:.2f}€")
                print(f"      Θέρμανση: {heating_share:.2f}€")
                print(f"      Ανελκύστρα: {elevator_share:.2f}€")
                print(f"      ΣΥΝΟΛΟ: {total_share:.2f}€")
                print()
        
        # Σύγκριση με τα δεδομένα που παρείχες
        print("🔍 ΣΥΓΚΡΙΣΗ ΜΕ ΤΑ ΠΑΡΕΙΧΘΕΝΤΑ ΔΕΔΟΜΕΝΑ:")
        print("=" * 50)
        
        expected_mills = 1000.00
        expected_common = 230.00
        expected_heating = 1500.00
        expected_electricity = 0.00
        
        print(f"Αναμενόμενα χιλιοστά: {expected_mills} | Πραγματικά: {total_mills} | {'✅' if abs(total_mills - expected_mills) < 0.01 else '❌'}")
        print(f"Αναμενόμενα κοινόχρηστα: {expected_common} | Πραγματικά: {other_expenses:.2f} | {'✅' if abs(other_expenses - expected_common) < 0.01 else '❌'}")
        print(f"Αναμενόμενη θέρμανση: {expected_heating} | Πραγματικά: {heating_expenses:.2f} | {'✅' if abs(heating_expenses - expected_heating) < 0.01 else '❌'}")
        print(f"Αναμενόμενη ανελκύστρα: {expected_electricity} | Πραγματικά: {elevator_expenses:.2f} | {'✅' if abs(elevator_expenses - expected_electricity) < 0.01 else '❌'}")

if __name__ == "__main__":
    final_check()
