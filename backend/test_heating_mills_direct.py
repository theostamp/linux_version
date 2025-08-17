#!/usr/bin/env python3
"""
Script για άμεσο έλεγχο των heating_mills από τη βάση δεδομένων
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building

def test_heating_mills_direct():
    """Άμεσος έλεγχος των heating_mills από τη βάση"""
    
    print("🔥 ΆΜΕΣΟΣ ΕΛΕΓΧΟΣ HEATING_MILLS")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Βρίσκουμε το κτίριο
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            print(f"🏢 Κτίριο: {building.name}")
            
            # Λαμβάνουμε όλα τα διαμερίσματα
            apartments = Apartment.objects.filter(building=building).order_by('number')
            
            print(f"\n📋 ΕΛΕΓΧΟΣ {apartments.count()} ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print("-" * 60)
            
            total_heating = 0
            total_elevator = 0
            total_participation = 0
            
            for apt in apartments:
                heating = apt.heating_mills or 0
                elevator = apt.elevator_mills or 0
                participation = apt.participation_mills or 0
                
                total_heating += heating
                total_elevator += elevator
                total_participation += participation
                
                print(f"Διαμέρισμα {apt.number:2s}: Θέρμανση={heating:3d} | Ανελκυστήρας={elevator:3d} | Συμμετοχή={participation:3d}")
            
            print("-" * 60)
            print(f"ΣΥΝΟΛΑ:")
            print(f"  • Θέρμανση: {total_heating}")
            print(f"  • Ανελκυστήρας: {total_elevator}")
            print(f"  • Συμμετοχή: {total_participation}")
            
            # Έλεγχος αν τα heating_mills είναι διαθέσιμα
            if total_heating > 0:
                print(f"\n✅ Τα heating_mills είναι διαθέσιμα!")
                print(f"   Το HeatingAnalysisModal θα λειτουργήσει σωστά.")
            else:
                print(f"\n❌ Δεν υπάρχουν heating_mills!")
                print(f"   Το HeatingAnalysisModal θα εμφανίσει 0€.")
            
            return total_heating > 0
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο")
            return False
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return False

if __name__ == "__main__":
    test_heating_mills_direct()
