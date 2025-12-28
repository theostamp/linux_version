#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Τελική διόρθωση χιλιοστών θέρμανσης
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment

def fix_heating_mills_final():
    """Τελική διόρθωση χιλιοστών θέρμανσης"""
    print("🔥 ΤΕΛΙΚΗ ΔΙΟΡΘΩΣΗ ΧΙΛΙΟΣΤΩΝ ΘΕΡΜΑΝΣΗΣ")
    print("=" * 40)
    
    building_id = 4
    
    with schema_context('demo'):
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        current_total = sum(apt.heating_mills or 0 for apt in apartments)
        print(f"Τρέχον σύνολο: {current_total}")
        
        if current_total != 1000:
            difference = 1000 - current_total
            print(f"Απαιτείται διόρθωση: +{difference}")
            
            # Προσθήκη της διαφοράς στο πρώτο διαμέρισμα
            first_apt = apartments.first()
            print(f"Προσθήκη {difference} στο διαμέρισμα {first_apt.number}")
            
            first_apt.heating_mills += difference
            first_apt.save()
            
            # Επαλήθευση
            new_total = sum(apt.heating_mills or 0 for apt in apartments)
            print(f"✅ Νέο σύνολο: {new_total}")
            
            if new_total == 1000:
                print("🎉 Τα χιλιοστά θέρμανσης διορθώθηκαν επιτυχώς!")
            else:
                print(f"❌ Εξακολουθεί να υπάρχει πρόβλημα: {new_total}")
        else:
            print("✅ Τα χιλιοστά θέρμανσης είναι ήδη σωστά")

if __name__ == "__main__":
    fix_heating_mills_final()
