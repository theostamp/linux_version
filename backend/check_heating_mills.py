#!/usr/bin/env python3
"""
Script για έλεγχο χιλιοστών θέρμανσης στο κτίριο Αλκμάνος 22
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
from apartments.models import Apartment

def check_heating_mills():
    """Ελέγχει τα χιλιοστά θέρμανσης για το κτίριο Αλκμάνος"""
    
    with schema_context('demo'):
        try:
            # Βρίσκουμε το κτίριο
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            print(f"🏢 Κτίριο: {building.name} - {building.address}")
            print(f"📊 Συνολικά διαμερίσματα: {building.apartments.count()}")
            print()
            
            # Λαμβάνουμε όλα τα διαμερίσματα
            apartments = Apartment.objects.filter(building=building).order_by('number')
            
            print("📋 ΧΙΛΙΟΣΤΑ ΘΕΡΜΑΝΣΗΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
            print("-" * 50)
            
            total_heating_mills = 0
            apartments_with_heating = 0
            
            for apt in apartments:
                heating_mills = apt.heating_mills or 0
                participation_mills = apt.participation_mills or 0
                
                print(f"Διαμέρισμα {apt.number:2s}: {heating_mills:6.0f} χιλιοστά θέρμανσης | {participation_mills:6.0f} χιλιοστά συμμετοχής")
                
                total_heating_mills += heating_mills
                if heating_mills > 0:
                    apartments_with_heating += 1
            
            print("-" * 50)
            print("ΣΥΝΟΛΑ:")
            print(f"  • Συνολικά χιλιοστά θέρμανσης: {total_heating_mills}")
            print(f"  • Διαμερίσματα με θέρμανση: {apartments_with_heating}/{apartments.count()}")
            print(f"  • Συνολικά χιλιοστά συμμετοχής: {sum(apt.participation_mills or 0 for apt in apartments)}")
            
            # Προτάσεις
            print()
            print("💡 ΠΡΟΤΑΣΕΙΣ:")
            
            if total_heating_mills == 0:
                print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ ΧΙΛΙΟΣΤΑ ΘΕΡΜΑΝΣΗΣ!")
                print("   Επιλογές:")
                print("   1. Εισαγωγή χιλιοστών θέρμανσης ανά διαμέρισμα")
                print("   2. Χρήση χιλιοστών συμμετοχής ως fallback")
                print("   3. Εξίσωση κατανομής (ίσα μερίδια)")
                
                # Υπολογισμός με χιλιοστά συμμετοχής
                total_participation = sum(apt.participation_mills or 0 for apt in apartments)
                if total_participation > 0:
                    print()
                    print("🔄 ΕΝΑΛΛΑΚΤΙΚΗ ΛΥΣΗ - Χρήση χιλιοστών συμμετοχής:")
                    for apt in apartments:
                        participation_mills = apt.participation_mills or 0
                        percentage = (participation_mills / total_participation * 100) if total_participation > 0 else 0
                        print(f"   Διαμέρισμα {apt.number}: {participation_mills} χιλιοστά ({percentage:.1f}%)")
            else:
                print("✅ Υπάρχουν χιλιοστά θέρμανσης!")
                print("   Η κατανομή θα γίνει σωστά.")
            
            return total_heating_mills > 0
            
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με διεύθυνση που περιέχει 'Αλκμάνος 22, Αθήνα 115 28'")
            return False
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return False
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return False

def suggest_heating_mills():
    """Προτείνει χιλιοστά θέρμανσης βάσει χιλιοστών συμμετοχής"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(address__icontains='Αλκμάνος 22, Αθήνα 115 28')
            apartments = Apartment.objects.filter(building=building).order_by('number')
            
            print()
            print("🎯 ΠΡΟΤΑΣΗ ΧΙΛΙΟΣΤΩΝ ΘΕΡΜΑΝΣΗΣ:")
            print("=" * 60)
            
            total_participation = sum(apt.participation_mills or 0 for apt in apartments)
            
            if total_participation == 0:
                print("❌ Δεν υπάρχουν χιλιοστά συμμετοχής!")
                return
            
            print("Βάσει χιλιοστών συμμετοχής (προσαρμογή 1:1):")
            print()
            
            for apt in apartments:
                participation_mills = apt.participation_mills or 0
                suggested_heating = participation_mills  # 1:1 mapping
                
                print(f"UPDATE apartments_apartment SET heating_mills = {suggested_heating} WHERE id = {apt.id}; -- Διαμέρισμα {apt.number}")
            
            print()
            print("💡 Εναλλακτικά, μπορείτε να χρησιμοποιήσετε:")
            print("   - Ίσα μερίδια: heating_mills = 100 για όλα")
            print("   - Προσαρμοσμένα μερίδια βάσει μεγέθους")
            print("   - Χιλιοστά συμμετοχής ως fallback στο backend")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    print("🔥 ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ ΘΕΡΜΑΝΣΗΣ - ΑΛΚΜΑΝΟΣ 22")
    print("=" * 60)
    
    has_heating_mills = check_heating_mills()
    
    if not has_heating_mills:
        suggest_heating_mills()
    
    print()
    print("✅ Ο έλεγχος ολοκληρώθηκε!")
