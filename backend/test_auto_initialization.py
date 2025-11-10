#!/usr/bin/env python3
"""
Script για έλεγχο της αυτόματης αρχικοποίησης
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

def test_auto_initialization():
    """Έλεγχος αυτόματης αρχικοποίησης"""
    
    print("🧪 ΈΛΕΓΧΟΣ ΑΥΤΟΜΑΤΗΣ ΑΡΧΙΚΟΠΟΙΗΣΗΣ")
    print("=" * 50)
    
    try:
        # Έλεγχος tenants
        tenants = Client.objects.all()
        print(f"✅ Βρέθηκαν {tenants.count()} tenants:")
        for tenant in tenants:
            print(f"   • {tenant.schema_name}: {tenant.name}")
        
        # Έλεγχος demo tenant
        demo_tenant = Client.objects.get(schema_name='demo')
        print(f"\n🏢 Έλεγχος demo tenant: {demo_tenant.name}")
        
        with tenant_context(demo_tenant):
            # Έλεγχος κτιρίων
            buildings = Building.objects.all()
            print(f"✅ Βρέθηκαν {buildings.count()} κτίρια:")
            
            for building in buildings:
                apartments_count = Apartment.objects.filter(building=building).count()
                print(f"   • {building.name} (ID: {building.id})")
                print(f"     Διεύθυνση: {building.address}, {building.city} {building.postal_code}")
                print(f"     Διαμερίσματα: {apartments_count}")
                
                # Ειδικός έλεγχος για Αλκμάνος 22
                if building.name == 'Πολυκατοικία Αλκμάνος 22':
                    print("     ✅ Αλκμάνος 22 βρέθηκε!")
                    print(f"     Αποθεματικό: {building.current_reserve}€")
                    print(f"     Χιλιοστά θέρμανσης: {building.heating_fixed_percentage}%")
                    
                    # Έλεγχος διαμερισμάτων
                    apartments = Apartment.objects.filter(building=building).order_by('number')
                    print("     📋 Διαμερίσματα Αλκμάνος 22:")
                    
                    total_mills = 0
                    rented_count = 0
                    owner_occupied_count = 0
                    
                    for apt in apartments:
                        mills = apt.participation_mills or 0
                        total_mills += mills
                        
                        if apt.is_rented:
                            rented_count += 1
                            status = f"Ενοικιασμένο → {apt.tenant_name}"
                        else:
                            owner_occupied_count += 1
                            status = "Ιδιοκατοίκηση"
                        
                        print(f"       • {apt.number} (Όροφος {apt.floor}): {apt.owner_name} - {status}")
                        print(f"         Χιλιοστά: {mills}, Τετ.μ.: {apt.square_meters}, Υπνοδωμάτια: {apt.bedrooms}")
                    
                    print("     📊 Σύνοψη Αλκμάνος 22:")
                    print(f"       Συνολικά χιλιοστά: {total_mills}")
                    print(f"       Ενοικιασμένα: {rented_count}")
                    print(f"       Ιδιοκατοίκηση: {owner_occupied_count}")
                    
                    if total_mills == 1000:
                        print("       ✅ Τα χιλιοστά αθροίζονται σωστά σε 1000")
                    else:
                        print(f"       ⚠️ Προσοχή: Τα χιλιοστά αθροίζονται σε {total_mills}")
                
                # Ειδικός έλεγχος για Αραχώβης 12
                elif building.name == 'Αραχώβης 12':
                    print("     ✅ Αραχώβης 12 βρέθηκε!")
                    print(f"     Αποθεματικό: {building.current_reserve}€")
                    
                    # Έλεγχος οικονομικών δεδομένων
                    try:
                        from financial.models import Expense, Payment
                        expenses_count = Expense.objects.filter(building=building).count()
                        payments_count = Payment.objects.filter(apartment__building=building).count()
                        print(f"     💰 Οικονομικά δεδομένα: {expenses_count} δαπάνες, {payments_count} εισπράξεις")
                    except ImportError:
                        print("     💰 Οικονομικά δεδομένα: Δεν διαθέσιμα")
        
        print("\n🎉 Έλεγχος ολοκληρώθηκε επιτυχώς!")
        print("📊 Σύνοψη:")
        print(f"   • Tenants: {tenants.count()}")
        print(f"   • Κτίρια: {buildings.count()}")
        print(f"   • Συνολικά διαμερίσματα: {Apartment.objects.count()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_auto_initialization()
    if success:
        print("\n✅ Η αυτόματη αρχικοποίηση λειτουργεί σωστά!")
    else:
        print("\n❌ Υπάρχουν προβλήματα με την αυτόματη αρχικοποίηση")
