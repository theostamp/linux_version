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
            # Get building by address
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            print(f"🏢 Κτίριο: {building.name}, {building.address}")
            print()
            
            # Get all apartments
            apartments = Apartment.objects.filter(building=building).order_by('number')
            
            print(f"📋 ΕΛΕΓΧΟΣ {apartments.count()} ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print("-" * 60)
            
            total_heating = 0
            total_elevator = 0
            total_participation = 0
            
            for apt in apartments:
                heating_mills = apt.heating_mills or 0
                elevator_mills = apt.elevator_mills or 0
                participation_mills = apt.participation_mills or 0
                
                total_heating += heating_mills
                total_elevator += elevator_mills
                total_participation += participation_mills
                
                print(f"Διαμέρισμα {apt.number:2}: Θέρμανση={heating_mills:3} | Ανελκυστήρας={elevator_mills:3} | Συμμετοχή={participation_mills:3}")
            
            print("-" * 60)
            print("ΣΥΝΟΛΑ:")
            print(f"  • Θέρμανση: {total_heating}")
            print(f"  • Ανελκυστήρας: {total_elevator}")
            print(f"  • Συμμετοχή: {total_participation}")
            print()
            
            if total_heating > 0:
                print("✅ Τα heating_mills είναι διαθέσιμα!")
                print("   Το HeatingAnalysisModal θα λειτουργήσει σωστά.")
            else:
                print("❌ Δεν βρέθηκαν heating_mills!")
                print("   Το HeatingAnalysisModal δεν θα λειτουργήσει.")
                
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22, Αθήνα 115 28")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    test_heating_mills_direct()
