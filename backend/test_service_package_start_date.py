#!/usr/bin/env python3
"""
Test script για τη νέα λειτουργικότητα ημερομηνίας έναρξης πακέτου υπηρεσιών
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building, ServicePackage

def test_service_package_start_date():
    """Δοκιμή της νέας λειτουργικότητας ημερομηνίας έναρξης"""
    
    with schema_context('demo'):
        print("🧪 Δοκιμή Ημερομηνίας Έναρξης Πακέτου Υπηρεσιών")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📦 Τρέχον πακέτο: {building.service_package}")
            print(f"💰 Τρέχουσα αμοιβή: {building.management_fee_per_apartment}€/διαμέρισμα")
            print(f"📅 Ημερομηνία έναρξης: {building.service_package_start_date}")
            print()
            
            # Βρίσκουμε διαθέσιμα πακέτα
            packages = ServicePackage.objects.filter(is_active=True)
            print(f"📦 Διαθέσιμα πακέτα: {packages.count()}")
            
            for pkg in packages:
                print(f"  - {pkg.name}: {pkg.fee_per_apartment}€/διαμέρισμα")
            print()
            
            # Δοκιμή εφαρμογής νέου πακέτου
            if packages.exists():
                new_package = packages.first()
                print(f"🔄 Εφαρμογή νέου πακέτου: {new_package.name}")
                
                # Αποθηκεύουμε την παλιά κατάσταση
                old_package = building.service_package
                old_fee = building.management_fee_per_apartment
                old_start_date = building.service_package_start_date
                
                # Εφαρμόζουμε το νέο πακέτο
                building.service_package = new_package
                building.management_fee_per_apartment = new_package.fee_per_apartment
                building.service_package_start_date = date.today()
                building.save()
                
                print(f"✅ Εφαρμόστηκε επιτυχώς!")
                print(f"   Παλιό πακέτο: {old_package}")
                print(f"   Νέο πακέτο: {building.service_package}")
                print(f"   Παλιή αμοιβή: {old_fee}€")
                print(f"   Νέα αμοιβή: {building.management_fee_per_apartment}€")
                print(f"   Παλιή ημερομηνία: {old_start_date}")
                print(f"   Νέα ημερομηνία: {building.service_package_start_date}")
                print()
                
                # Δοκιμή εφαρμογής δεύτερου πακέτου (για να δούμε την αλλαγή)
                if packages.count() > 1:
                    second_package = packages[1]
                    print(f"🔄 Εφαρμογή δεύτερου πακέτου: {second_package.name}")
                    
                    building.service_package = second_package
                    building.management_fee_per_apartment = second_package.fee_per_apartment
                    building.service_package_start_date = date.today() + timedelta(days=1)  # Αύριο
                    building.save()
                    
                    print(f"✅ Εφαρμόστηκε επιτυχώς!")
                    print(f"   Πακέτο: {building.service_package}")
                    print(f"   Αμοιβή: {building.management_fee_per_apartment}€")
                    print(f"   Ημερομηνία έναρξης: {building.service_package_start_date}")
                    print()
                
                print("🎉 Δοκιμή ολοκληρώθηκε επιτυχώς!")
                print("💡 Το σύστημα τώρα αποθηκεύει την ημερομηνία έναρξης κάθε πακέτου")
                print("💡 Κάθε νέο πακέτο αντικαθιστά το προηγούμενο με νέα ημερομηνία έναρξης")
                
            else:
                print("⚠️ Δεν βρέθηκαν διαθέσιμα πακέτα για δοκιμή")
                
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID=1")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    test_service_package_start_date()
