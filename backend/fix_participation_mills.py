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
from decimal import Decimal

def fix_participation_mills():
    """
    Διορθώνει το πρόβλημα των χιλιοστών στο κτίριο Αραχώβης 12
    """
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο Αραχώβης 12
        building = Building.objects.get(name='Αραχώβης 12')
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        print(f"🔧 ΔΙΟΡΘΩΣΗ ΧΙΛΙΟΣΤΩΝ - ΚΤΙΡΙΟ {building.name}")
        print("=" * 60)
        
        # Εμφάνιση τρέχοντος κατάστασης
        print("\n📊 ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ:")
        total_mills = 0
        for apt in apartments:
            mills = apt.participation_mills or 0
            total_mills += mills
            print(f"   {apt.number}: {mills} χιλιοστά")
        
        print(f"\n   ΣΥΝΟΛΙΚΟ: {total_mills} χιλιοστά (πρέπει να είναι 1000)")
        
        if total_mills == 1000:
            print("\n✅ Τα χιλιοστά είναι ήδη σωστά!")
            return
        
        # Υπολογισμός διορθώσεων
        print(f"\n🔧 ΥΠΟΛΟΓΙΣΜΟΣ ΔΙΟΡΘΩΣΕΩΝ:")
        difference = 1000 - total_mills
        print(f"   Διαφορά: {difference} χιλιοστά")
        
        if difference > 0:
            # Χρειάζεται να προσθέσουμε χιλιοστά
            print(f"   Χρειάζεται να προσθέσουμε {difference} χιλιοστά")
            
            # Κατανομή ισόποσα στα διαμερίσματα
            apartments_count = len(apartments)
            mills_per_apartment = difference // apartments_count
            remaining_mills = difference % apartments_count
            
            print(f"   {mills_per_apartment} χιλιοστά ανά διαμέρισμα + {remaining_mills} επιπλέον")
            
            # Εφαρμογή διορθώσεων
            for i, apt in enumerate(apartments):
                current_mills = apt.participation_mills or 0
                additional_mills = mills_per_apartment + (1 if i < remaining_mills else 0)
                new_mills = current_mills + additional_mills
                
                apt.participation_mills = new_mills
                apt.save()
                
                print(f"   {apt.number}: {current_mills} → {new_mills} (+{additional_mills})")
        
        else:
            # Χρειάζεται να αφαιρέσουμε χιλιοστά
            print(f"   Χρειάζεται να αφαιρέσουμε {abs(difference)} χιλιοστά")
            
            # Κατανομή ισόποσα στα διαμερίσματα
            apartments_count = len(apartments)
            mills_per_apartment = abs(difference) // apartments_count
            remaining_mills = abs(difference) % apartments_count
            
            print(f"   {mills_per_apartment} χιλιοστά ανά διαμέρισμα + {remaining_mills} επιπλέον")
            
            # Εφαρμογή διορθώσεων
            for i, apt in enumerate(apartments):
                current_mills = apt.participation_mills or 0
                reduction_mills = mills_per_apartment + (1 if i < remaining_mills else 0)
                new_mills = max(0, current_mills - reduction_mills)  # Δεν μπορεί να είναι αρνητικό
                
                apt.participation_mills = new_mills
                apt.save()
                
                print(f"   {apt.number}: {current_mills} → {new_mills} (-{reduction_mills})")
        
        # Επιβεβαίωση
        print(f"\n✅ ΕΠΙΒΕΒΑΙΩΣΗ:")
        total_mills_after = 0
        for apt in apartments:
            mills = apt.participation_mills or 0
            total_mills_after += mills
            print(f"   {apt.number}: {mills} χιλιοστά")
        
        print(f"\n   ΣΥΝΟΛΙΚΟ: {total_mills_after} χιλιοστά")
        
        if total_mills_after == 1000:
            print("✅ ΔΙΟΡΘΩΣΗ ΕΠΙΤΥΧΗΣ!")
        else:
            print(f"❌ ΑΚΟΜΑ ΥΠΑΡΧΕΙ ΠΡΟΒΛΗΜΑ: {total_mills_after} χιλιοστά")


def check_all_buildings_mills():
    """
    Ελέγχει τα χιλιοστά σε όλα τα κτίρια
    """
    with schema_context('demo'):
        buildings = Building.objects.all()
        
        print("🔍 ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ ΣΕ ΟΛΑ ΤΑ ΚΤΙΡΙΑ")
        print("=" * 60)
        
        for building in buildings:
            apartments = Apartment.objects.filter(building=building)
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            
            status = "✅" if total_mills == 1000 else "❌"
            print(f"{status} {building.name}: {total_mills} χιλιοστά ({len(apartments)} διαμερίσματα)")


if __name__ == "__main__":
    # Έλεγχος όλων των κτιρίων
    check_all_buildings_mills()
    
    print("\n" + "=" * 60)
    
    # Διόρθωση του κτιρίου Αραχώβης 12
    fix_participation_mills()
