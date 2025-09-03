#!/usr/bin/env python3
"""
Script για διόρθωση χιλιοστών συμμετοχής στο κτίριο 3
Αλλάζει τα χιλιοστά ώστε να αθροίζονται σε 1000 αντί για 1020
"""

import os
import sys
import django

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apartments.models import Apartment
from buildings.models import Building

def fix_mills_to_1000():
    """Διόρθωση χιλιοστών ώστε να αθροίζονται σε 1000"""
    
    # Εύρεση του κτιρίου 3
    try:
        building = Building.objects.get(id=3)
        print(f"🏢 Βρέθηκε κτίριο: {building.name}")
    except Building.DoesNotExist:
        print("❌ Δεν βρέθηκε κτίριο με ID 3")
        return
    
    # Εύρεση όλων των διαμερισμάτων του κτιρίου
    apartments = Apartment.objects.filter(building=building).order_by('number')
    
    if not apartments.exists():
        print("❌ Δεν βρέθηκαν διαμερίσματα για το κτίριο")
        return
    
    print(f"📋 Βρέθηκαν {apartments.count()} διαμερίσματα")
    
    # Υπολογισμός νέων χιλιοστών
    # Θα διατηρήσουμε τις αναλογίες αλλά θα κλιμακώσουμε σε 1000
    total_current_mills = sum(apt.participation_mills or 0 for apt in apartments)
    
    if total_current_mills == 0:
        print("❌ Δεν υπάρχουν χιλιοστά για διόρθωση")
        return
    
    print(f"💰 Τρέχοντα συνολικά χιλιοστά: {total_current_mills}")
    
    # Κλιμάκωση σε 1000
    scale_factor = 1000 / total_current_mills
    
    print(f"📊 Παράγοντας κλιμάκωσης: {scale_factor:.4f}")
    
    # Ενημέρωση χιλιοστών
    updated_apartments = []
    
    for apartment in apartments:
        old_mills = apartment.participation_mills or 0
        new_mills = int(round(old_mills * scale_factor))
        
        # Διόρθωση για να είμαστε σίγουροι ότι αθροίζονται σε 1000
        if apartment == apartments.last():
            # Για το τελευταίο διαμέρισμα, υπολογίζουμε το υπόλοιπο
            used_mills = sum(apt.participation_mills or 0 for apt in apartments[:-1])
            new_mills = 1000 - used_mills
            if new_mills < 0:
                new_mills = 0
        
        apartment.participation_mills = new_mills
        apartment.save()
        
        updated_apartments.append({
            'number': apartment.number,
            'old_mills': old_mills,
            'new_mills': new_mills,
            'percentage': (new_mills / 1000) * 100
        })
        
        print(f"🏠 Διαμέρισμα {apartment.number}: {old_mills} → {new_mills} ({new_mills/10:.1f}%)")
    
    # Επιβεβαίωση
    final_total = sum(apt.participation_mills or 0 for apt in apartments)
    print(f"\n✅ Τελικό άθροισμα χιλιοστών: {final_total}")
    
    if final_total == 1000:
        print("🎉 Επιτυχία! Τα χιλιοστά αθροίζονται σωστά σε 1000")
    else:
        print(f"⚠️ Προσοχή: Το άθροισμα είναι {final_total} αντί για 1000")
    
    # Εκτύπωση τελικής κατανομής
    print("\n📊 Τελική Κατανομή Χιλιοστών:")
    print("=" * 50)
    print(f"{'Διαμέρισμα':<12} {'Χιλιοστά':<10} {'Ποσοστό':<10} {'Κατάσταση':<15}")
    print("-" * 50)
    
    for apt_data in updated_apartments:
        apartment = next(apt for apt in apartments if apt.number == apt_data['number'])
        status = "Ενοικιασμένο" if apartment.is_rented else "Ιδιοκατοίκηση" if apartment.owner_name else "Κενό"
        print(f"{apt_data['number']:<12} {apt_data['new_mills']:<10} {apt_data['percentage']:<10.1f}% {status:<15}")
    
    print("-" * 50)
    print(f"{'ΣΥΝΟΛΟ':<12} {final_total:<10} {'100.0':<10}%")

if __name__ == "__main__":
    print("🔧 Ξεκινάει διόρθωση χιλιοστών...")
    fix_mills_to_1000()
    print("✅ Ολοκληρώθηκε η διόρθωση χιλιοστών!")
