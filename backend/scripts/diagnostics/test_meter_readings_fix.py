#!/usr/bin/env python3
"""
Test script για τη διόρθωση των μετρήσεων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MeterReading
from apartments.models import Apartment
from buildings.models import Building
from datetime import date

def test_meter_readings_fix():
    """
    Δοκιμάζει τη διόρθωση των μετρήσεων
    """
    
    print("🧪 ΔΟΚΙΜΗ ΔΙΟΡΘΩΣΗΣ ΜΕΤΡΗΣΕΩΝ")
    print("=" * 40)
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(name__icontains='Αλκμάνος')
            apartments = Apartment.objects.filter(building=building)
            
            print(f"🏢 Κτίριο: {building.name}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            
            # Έλεγχος υπαρχουσών μετρήσεων
            readings = MeterReading.objects.filter(apartment__building=building)
            print(f"📊 Συνολικές μετρήσεις: {readings.count()}")
            
            # Μετρήσεις ανά διαμέρισμα
            for apartment in apartments.order_by('number'):
                apartment_readings = readings.filter(apartment=apartment)
                print(f"🏠 Διαμέρισμα {apartment.number} (ID: {apartment.id}): {apartment_readings.count()} μετρήσεις")
                
                if apartment_readings.exists():
                    for reading in apartment_readings:
                        print(f"      ✅ {reading.reading_date}: {reading.value} ({reading.get_meter_type_display()})")
                else:
                    print(f"      ❌ Δεν έχει μετρήσεις")
            
            # Δοκιμή δημιουργίας μετρήσης για διαμέρισμα χωρίς μετρήσεις
            apartments_without_readings = []
            for apartment in apartments:
                existing_reading = MeterReading.objects.filter(
                    apartment=apartment,
                    meter_type='heating_hours',
                    reading_date=date(2025, 9, 15)
                ).exists()
                
                if not existing_reading:
                    apartments_without_readings.append(apartment)
            
            print(f"\n🔧 ΔΙΑΜΕΡΙΣΜΑΤΑ ΧΩΡΙΣ ΜΕΤΡΗΣΕΙΣ: {len(apartments_without_readings)}")
            
            if apartments_without_readings:
                print("📝 Δημιουργία μετρήσεων για τα υπόλοιπα διαμερίσματα...")
                
                for i, apartment in enumerate(apartments_without_readings):
                    try:
                        reading = MeterReading.objects.create(
                            apartment=apartment,
                            reading_date=date(2025, 9, 15),
                            value=30.0 + (i * 5),  # Διαφορετικές τιμές
                            meter_type='heating_hours',
                            notes=f'Test reading {i+1}'
                        )
                        print(f"   ✅ Διαμέρισμα {apartment.number}: {reading.value} ώρες")
                        
                        # Μικρό delay
                        import time
                        time.sleep(0.1)
                        
                    except Exception as e:
                        print(f"   ❌ Σφάλμα διαμέρισμα {apartment.number}: {e}")
            
            # Τελική επαλήθευση
            final_readings = MeterReading.objects.filter(apartment__building=building)
            apartments_with_readings = len([a for a in apartments if final_readings.filter(apartment=a).exists()])
            
            print(f"\n🎯 ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
            print(f"   Συνολικά διαμερίσματα: {apartments.count()}")
            print(f"   Διαμερίσματα με μετρήσεις: {apartments_with_readings}")
            print(f"   Συνολικές μετρήσεις: {final_readings.count()}")
            
            if apartments_with_readings == apartments.count():
                print("🎉 Όλα τα διαμερίσματα έχουν μετρήσεις!")
            else:
                print(f"⚠️ Ακόμα {apartments.count() - apartments_with_readings} διαμερίσματα χρειάζονται μετρήσεις")
            
            return True
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_meter_readings_fix()
    if success:
        print("\n✅ Η δοκιμή ολοκληρώθηκε επιτυχώς!")
    else:
        print("\n❌ Η δοκιμή απέτυχε!")
