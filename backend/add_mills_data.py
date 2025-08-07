#!/usr/bin/env python3
"""
Script για την προσθήκη demo δεδομένων χιλιοστών στα διαμερίσματα του κτιρίου 3
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from apartments.models import Apartment
from django.db import transaction

def add_mills_data():
    """Προσθήκη demo δεδομένων χιλιοστών"""
    
    print("🏢 Προσθήκη demo δεδομένων χιλιοστών...")
    
    # Λήψη όλων των διαμερισμάτων του κτιρίου 3
    apartments = Apartment.objects.filter(building_id=3).order_by('number')
    
    if not apartments.exists():
        print("❌ Δεν βρέθηκαν διαμερίσματα στο κτίριο 3")
        return
    
    print(f"📊 Βρέθηκαν {apartments.count()} διαμερίσματα")
    
    # Demo δεδομένα χιλιοστών
    mills_data = [
        # (ownership_percentage, heating_mills, elevator_mills)
        (8.5, 85, 85),   # Διαμέρισμα 1
        (7.5, 75, 75),   # Διαμέρισμα 2
        (9.0, 90, 90),   # Διαμέρισμα 3
        (8.0, 80, 80),   # Διαμέρισμα 4
        (9.5, 95, 95),   # Διαμέρισμα 5
        (7.0, 70, 70),   # Διαμέρισμα 6
        (8.5, 85, 85),   # Διαμέρισμα 7
        (10.0, 100, 100), # Διαμέρισμα 8
        (7.5, 75, 75),   # Διαμέρισμα 9
        (9.0, 90, 90),   # Διαμέρισμα 10
        (8.0, 80, 80),   # Διαμέρισμα 11
        (9.5, 95, 95),   # Διαμέρισμα 12
    ]
    
    with transaction.atomic():
        for i, apartment in enumerate(apartments):
            if i < len(mills_data):
                ownership_pct, heating, elevator = mills_data[i]
                
                apartment.ownership_percentage = ownership_pct
                apartment.heating_mills = heating
                apartment.elevator_mills = elevator
                apartment.save()
                
                print(f"🏠 Διαμέρισμα {apartment.number}: Ιδιοκτησίας={ownership_pct}%, Θέρμανσης={heating}χλ., Ανελκυστήρα={elevator}χλ.")
    
    print("\n✅ Επιτυχής προσθήκη demo δεδομένων χιλιοστών!")
    
    # Επιβεβαίωση
    print("\n📊 Επιβεβαίωση δεδομένων:")
    for apartment in apartments:
        print(f"🏠 Διαμέρισμα {apartment.number}: "
              f"Ιδιοκτησίας={apartment.ownership_percentage}%, "
              f"Θέρμανσης={apartment.heating_mills}χλ., "
              f"Ανελκυστήρα={apartment.elevator_mills}χλ.")

if __name__ == '__main__':
    add_mills_data()
