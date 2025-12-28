#!/usr/bin/env python3
"""
Script για ενημέρωση των ονομάτων διαμερισμάτων σε ελληνική ονοματολογία
"""

import os
import sys
import django

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment

def update_apartment_names_to_greek():
    """Ενημέρωση ονομάτων διαμερισμάτων σε ελληνική ονοματολογία"""
    
    print("🔄 Ενημέρωση ονομάτων διαμερισμάτων σε ελληνική ονοματολογία...")
    
    # Αντιστοίχιση λατινικών σε ελληνικούς χαρακτήρες
    greek_mapping = {
        'A1': 'Α1',
        'A2': 'Α2', 
        'B1': 'Β1',
        'B2': 'Β2',
        'C1': 'Γ1',
        'C2': 'Γ2',
        'D1': 'Δ1',
        'D2': 'Δ2',
        'E1': 'Ε1',
        'E2': 'Ε2'
    }
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(name='Κτίριο Σόλωνος 22')
            print(f"🏢 Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
            
            apartments = Apartment.objects.filter(building=building)
            updated_count = 0
            
            print("\n📝 Ενημέρωση ονομάτων διαμερισμάτων:")
            for apt in apartments.order_by('number'):
                old_number = apt.number
                if old_number in greek_mapping:
                    new_number = greek_mapping[old_number]
                    apt.number = new_number
                    apt.save()
                    updated_count += 1
                    print(f"  ✅ {old_number} → {new_number}: {apt.owner_name}")
                else:
                    print(f"  ⚠️  Δεν βρέθηκε αντιστοίχιση για: {old_number}")
            
            print(f"\n🎉 Ενημερώθηκαν {updated_count} διαμερίσματα!")
            
            # Εμφάνιση ενημερωμένης λίστας
            print("\n📋 Ενημερωμένη λίστα διαμερισμάτων:")
            updated_apartments = Apartment.objects.filter(building=building).order_by('number')
            for apt in updated_apartments:
                status = "🏠 Ενοικιασμένο" if apt.is_rented else "👤 Ιδιοκατοίκηση" if not apt.is_closed else "🚪 Κενό"
                print(f"  {apt.number}: {apt.owner_name} - {apt.occupant_name} ({status})")
            
            return True
            
        except Building.DoesNotExist:
            print("❌ Το κτίριο Σόλωνος 22 δεν βρέθηκε!")
            return False
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return False

if __name__ == "__main__":
    success = update_apartment_names_to_greek()
    if success:
        print("\n✅ Η ενημέρωση ολοκληρώθηκε επιτυχώς!")
    else:
        print("\n❌ Η ενημέρωση απέτυχε!")
        sys.exit(1)
