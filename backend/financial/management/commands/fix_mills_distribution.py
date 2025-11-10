#!/usr/bin/env python3
"""
🔧 Έξυπνη Διόρθωση Χιλιοστών - New Concierge
============================================

Script για έξυπνη και ισορροπημένη διόρθωση των χιλιοστών συμμετοχής.
Αντί να αλλάζει μόνο το πρώτο διαμέρισμα, κατανέμει τη διαφορά
ισορροπημένα σε όλα τα διαμερίσματα.

Χρήση:
    python manage.py fix_mills_distribution [--building-id BUILDING_ID]
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment


def fix_mills_distribution(building_id: int = None) -> bool:
    """
    🔧 Έξυπνη διόρθωση χιλιοστών συμμετοχής
    
    Args:
        building_id: ID του κτιρίου (αν None, χρησιμοποιεί το πρώτο)
    
    Returns:
        bool: True αν η διόρθωση ήταν επιτυχής
    """
    
    with schema_context('demo'):
        # Εύρεση κτιρίου
        if building_id:
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                print(f"❌ Δεν βρέθηκε κτίριο με ID {building_id}")
                return False
        else:
            building = Building.objects.first()
            if not building:
                print("❌ Δεν βρέθηκε κανένα κτίριο")
                return False
        
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        # Εύρεση διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        if not apartments.exists():
            print("❌ Δεν βρέθηκαν διαμερίσματα")
            return False
        
        print(f"🏠 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # Υπολογισμός τρέχοντος συνόλου
        current_total = sum(apt.participation_mills or 0 for apt in apartments)
        expected_total = 1000
        difference = current_total - expected_total
        
        print(f"💰 Τρέχον σύνολο χιλιοστών: {current_total}")
        print(f"🎯 Αναμενόμενο σύνολο: {expected_total}")
        print(f"📊 Διαφορά: {difference}")
        
        if difference == 0:
            print("✅ Τα χιλιοστά είναι ήδη σωστά!")
            return True
        
        # Έξυπνη διόρθωση
        print("\n🔧 Εφαρμογή έξυπνης διόρθωσης...")
        
        if abs(difference) <= apartments.count():
            # Μικρή διαφορά - κατανέμουμε ισόποσα
            print("📊 Μικρή διαφορά - ισόποση κατανομή")
            adjustment_per_apartment = difference / apartments.count()
            
            for apartment in apartments:
                current_mills = apartment.participation_mills or 0
                new_mills = max(0, current_mills - adjustment_per_apartment)
                apartment.participation_mills = new_mills
                apartment.save()
                
                print(f"   {apartment.number}: {current_mills} → {new_mills} ({adjustment_per_apartment:+.1f})")
        
        else:
            # Μεγάλη διαφορά - κατανέμουμε αναλογικά
            print("📊 Μεγάλη διαφορά - αναλογική κατανομή")
            
            # Υπολογισμός αναλογικής κατανομής
            total_current = sum(apt.participation_mills or 0 for apt in apartments)
            if total_current > 0:
                # Αναλογική μείωση/αύξηση
                for apartment in apartments:
                    current_mills = apartment.participation_mills or 0
                    if total_current > 0:
                        proportion = current_mills / total_current
                        adjustment = difference * proportion
                        new_mills = max(0, current_mills - adjustment)
                    else:
                        # Αν δεν υπάρχουν χιλιοστά, κατανέμουμε ισόποσα
                        new_mills = expected_total / apartments.count()
                    
                    apartment.participation_mills = new_mills
                    apartment.save()
                    
                    print(f"   {apartment.number}: {current_mills} → {new_mills:.1f}")
            else:
                # Αν δεν υπάρχουν καθόλου χιλιοστά, κατανέμουμε ισόποσα
                equal_share = expected_total / apartments.count()
                for apartment in apartments:
                    apartment.participation_mills = equal_share
                    apartment.save()
                    print(f"   {apartment.number}: 0 → {equal_share:.1f}")
        
        # Επιβεβαίωση
        updated_total = sum(apt.participation_mills or 0 for apt in apartments)
        print("\n📊 Επιβεβαίωση:")
        print(f"   Νέο σύνολο: {updated_total}")
        print(f"   Διαφορά από στόχο: {updated_total - expected_total}")
        
        if abs(updated_total - expected_total) < 0.1:
            print("✅ Η διόρθωση ήταν επιτυχής!")
            
            # Εμφάνιση τελικής κατανομής
            print("\n📋 Τελική Κατανομή:")
            for apartment in apartments:
                mills = apartment.participation_mills or 0
                percentage = (mills / expected_total) * 100
                print(f"   {apartment.number}: {mills:.1f} χιλιοστά ({percentage:.1f}%)")
            
            return True
        else:
            print("⚠️ Η διόρθωση δεν ήταν πλήρης")
            return False


def main():
    """🏁 Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Έξυπνη διόρθωση χιλιοστών')
    parser.add_argument('--building-id', type=int, help='ID του κτιρίου')
    
    args = parser.parse_args()
    
    print("🔧 Έξυπνη Διόρθωση Χιλιοστών")
    print("=" * 50)
    
    success = fix_mills_distribution(args.building_id)
    
    if success:
        print("\n🎉 Η διόρθωση ολοκληρώθηκε επιτυχώς!")
        sys.exit(0)
    else:
        print("\n❌ Η διόρθωση απέτυχε!")
        sys.exit(1)


if __name__ == '__main__':
    main()
