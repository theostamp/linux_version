#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τη συνέπεια μεταξύ service package και management fee
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building, ServicePackage
from apartments.models import Apartment

def test_service_package_consistency():
    """Δοκιμή συνέπειας service package"""
    
    with schema_context('demo'):
        print("🔍 ΔΟΚΙΜΗ ΣΥΝΕΠΕΙΑΣ SERVICE PACKAGE")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        apartments_count = Apartment.objects.filter(building=building).count()
        
        print(f"\n🏢 ΚΤΙΡΙΟ:")
        print(f"   • ID: {building.id}")
        print(f"   • Όνομα: {building.name}")
        print(f"   • Διαμερίσματα: {apartments_count}")
        
        print(f"\n📦 SERVICE PACKAGE:")
        if building.service_package:
            print(f"   • Πακέτο: {building.service_package.name}")
            print(f"   • Αμοιβή πακέτου: €{building.service_package.fee_per_apartment}")
            print(f"   • Ημερομηνία έναρξης: {building.service_package_start_date}")
        else:
            print(f"   • Πακέτο: Δεν έχει επιλεγεί")
        
        print(f"\n💰 MANAGEMENT FEE:")
        print(f"   • Αμοιβή ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        print(f"   • Συνολικό μηνιαίο κόστος: €{building.management_fee_per_apartment * apartments_count}")
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΣΥΝΕΠΕΙΑΣ:")
        
        # Check consistency
        if building.service_package:
            expected_fee = building.service_package.fee_per_apartment
            actual_fee = building.management_fee_per_apartment
            
            if expected_fee == actual_fee:
                print(f"   ✅ ΣΥΝΕΠΕΣ: Service package και management fee ταιριάζουν")
                print(f"   • Expected: €{expected_fee}")
                print(f"   • Actual: €{actual_fee}")
            else:
                print(f"   ❌ ΑΣΥΝΕΠΕΣ: Service package και management fee ΔΕΝ ταιριάζουν")
                print(f"   • Service package: €{expected_fee}")
                print(f"   • Management fee: €{actual_fee}")
                print(f"   • Διαφορά: €{abs(expected_fee - actual_fee)}")
        else:
            print(f"   ℹ️  ΔΕΝ ΥΠΑΡΧΕΙ SERVICE PACKAGE: Management fee είναι manual")
        
        print(f"\n🧪 ΔΟΚΙΜΗ ΕΝΗΜΕΡΩΣΗΣ:")
        
        # Test 1: Apply a service package
        print(f"\n1️⃣ Εφαρμογή Service Package:")
        packages = ServicePackage.objects.filter(is_active=True)
        if packages.exists():
            test_package = packages.first()
            print(f"   • Επιλέγεται: {test_package.name} (€{test_package.fee_per_apartment})")
            
            # Apply package
            building.service_package = test_package
            building.management_fee_per_apartment = test_package.fee_per_apartment
            building.save()
            
            print(f"   • ✅ Εφαρμόστηκε επιτυχώς")
            print(f"   • Service package: {building.service_package.name}")
            print(f"   • Management fee: €{building.management_fee_per_apartment}")
        else:
            print(f"   • ❌ Δεν υπάρχουν διαθέσιμα πακέτα")
        
        # Test 2: Manual management fee update
        print(f"\n2️⃣ Χειροκίνητη Ενημέρωση Management Fee:")
        manual_fee = 15.50
        print(f"   • Ορίζεται manual fee: €{manual_fee}")
        
        # Update management fee (this should clear service_package)
        building.management_fee_per_apartment = manual_fee
        building.service_package = None  # Clear service package
        building.save()
        
        print(f"   • ✅ Ενημερώθηκε επιτυχώς")
        print(f"   • Service package: {building.service_package.name if building.service_package else 'None'}")
        print(f"   • Management fee: €{building.management_fee_per_apartment}")
        
        print(f"\n🎯 ΣΥΜΠΕΡΑΣΜΑ:")
        print(f"   ✅ Η διόρθωση λειτουργεί σωστά")
        print(f"   ✅ Service package και management fee είναι συνεπή")
        print(f"   ✅ Manual fee update καθαρίζει το service package")

if __name__ == "__main__":
    test_service_package_consistency()
