#!/usr/bin/env python3
"""
Script για έλεγχο διαχειριστικών δαπανών
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_management_fees():
    """Έλεγχος διαχειριστικών δαπανών"""
    
    print("💰 ΕΛΕΓΧΟΣ ΔΙΑΧΕΙΡΙΣΤΙΚΩΝ ΔΑΠΑΝΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Get building by address
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            building_id = building.id
            print(f"🏢 Κτίριο: {building.name}, {building.address} (ID: {building_id})")
            print()
            
            # Check management fees
            management_fee = building.management_fee_per_apartment or 0
            apartments_count = building.apartments_count or 0
            total_management = management_fee * apartments_count
            
            print("📋 Διαχειριστικές Δαπάνες:")
            print("-" * 30)
            print(f"   Αμοιβή ανά διαμέρισμα: {management_fee}€")
            print(f"   Αριθμός διαμερισμάτων: {apartments_count}")
            print(f"   Συνολική αμοιβή: {total_management}€")
            print()
            
            # Check if this explains the 50€ difference
            print("🔍 ΕΛΕΓΧΟΣ ΔΙΑΦΟΡΑΣ:")
            print("-" * 20)
            print(f"   Συνολικές δαπάνες: 1780€")
            print(f"   Διαχειριστικές δαπάνες: {total_management}€")
            print(f"   Σύνολο με διαχείριση: {1780 + total_management}€")
            print(f"   Αναμενόμενο σύνολο: 1830€")
            
            difference = abs((1780 + total_management) - 1830)
            print(f"   Διαφορά: {difference}€")
            
            if difference < 0.01:
                print("✅ Η διαφορά των 50€ εξηγείται από τις διαχειριστικές δαπάνες!")
            else:
                print("❌ Η διαφορά δεν εξηγείται από τις διαχειριστικές δαπάνες")
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22, Αθήνα 115 28")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    check_management_fees()
