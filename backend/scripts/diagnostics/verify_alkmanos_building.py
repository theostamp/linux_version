#!/usr/bin/env python3
"""
Script επαλήθευσης για την πολυκατοικία Αλκμάνος 22
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment

def verify_alkmanos_building():
    """Επαλήθευση πολυκατοικίας Αλκμάνος 22"""
    
    try:
        # Εύρεση του demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {tenant.name}")
        
        # Εύρεση κτιρίου στο tenant context
        with tenant_context(tenant):
            try:
                building = Building.objects.get(name="Πολυκατοικία Αλκμάνος 22")
                print(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
                print(f"📍 Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
                print(f"💰 Αποθεματικό: {building.current_reserve}€")
                print(f"🔥 Ποσοστό παγίου θέρμανσης: {building.heating_fixed_percentage}%")
                print(f"💳 Εισφορά αποθεματικού ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
                
                # Εύρεση διαμερισμάτων
                apartments = Apartment.objects.filter(building=building).order_by('number')
                print(f"\n🏠 Συνολικά διαμερίσματα: {apartments.count()}")
                
                if apartments.exists():
                    print("\n📋 Λεπτομέρειες διαμερισμάτων:")
                    print("=" * 120)
                    print(f"{'Αρ.':<4} {'Όροφος':<8} {'Ιδιοκτήτης':<25} {'Ενοίκος':<25} {'Χιλιοστά':<10} {'Τετ.μ.':<8} {'Κατάσταση':<15}")
                    print("=" * 120)
                    
                    total_mills = 0
                    total_heating_mills = 0
                    total_elevator_mills = 0
                    rented_count = 0
                    owner_occupied_count = 0
                    
                    for apt in apartments:
                        mills = apt.participation_mills or 0
                        heating_mills = apt.heating_mills or 0
                        elevator_mills = apt.elevator_mills or 0
                        
                        total_mills += mills
                        total_heating_mills += heating_mills
                        total_elevator_mills += elevator_mills
                        
                        if apt.is_rented:
                            status = "Ενοικιασμένο"
                            rented_count += 1
                        elif apt.is_closed:
                            status = "Κενό"
                        else:
                            status = "Ιδιοκατοίκηση"
                            owner_occupied_count += 1
                        
                        print(f"{apt.number:<4} {apt.floor or '-':<8} {apt.owner_name[:24]:<25} {apt.tenant_name[:24] if apt.tenant_name else '-':<25} {mills:<10} {apt.square_meters or '-':<8} {status:<15}")
                    
                    print("=" * 120)
                    print(f"ΣΥΝΟΛΑ: Χιλιοστά={total_mills}, Θέρμανσης={total_heating_mills}, Ανελκυστήρα={total_elevator_mills}")
                    print(f"ΚΑΤΑΝΟΜΗ: Ενοικιασμένα={rented_count}, Ιδιοκατοίκηση={owner_occupied_count}")
                    
                    # Έλεγχος χιλιοστών
                    if total_mills == 1000:
                        print("✅ Τα χιλιοστά αθροίζονται σωστά σε 1000")
                    else:
                        print(f"⚠️ Προσοχή: Τα χιλιοστά αθροίζονται σε {total_mills} αντί για 1000")
                    
                    # Εμφάνιση ενοικιασμένων διαμερισμάτων
                    rented_apartments = apartments.filter(is_rented=True)
                    if rented_apartments.exists():
                        print(f"\n🏠 Ενοικιασμένα διαμερίσματα ({rented_apartments.count()}):")
                        for apt in rented_apartments:
                            print(f"  • Διαμέρισμα {apt.number}: {apt.tenant_name} (έναρξη: {apt.rent_start_date}, λήξη: {apt.rent_end_date})")
                    
                    # Εμφάνιση ιδιοκατοικημένων διαμερισμάτων
                    owner_apartments = apartments.filter(is_rented=False, is_closed=False)
                    if owner_apartments.exists():
                        print(f"\n👤 Ιδιοκατοικημένα διαμερίσματα ({owner_apartments.count()}):")
                        for apt in owner_apartments:
                            print(f"  • Διαμέρισμα {apt.number}: {apt.owner_name}")
                
                else:
                    print("❌ Δεν βρέθηκαν διαμερίσματα")
                    
            except Building.DoesNotExist:
                print("❌ Δεν βρέθηκε κτίριο 'Πολυκατοικία Αλκμάνος 22'")
                
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_alkmanos_building()
