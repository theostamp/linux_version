#!/usr/bin/env python
"""
Διόρθωση Management Fees για Buildings χωρίς Service Package

Λογική:
1. ΑΝ το Building ΔΕΝ έχει επιλεγμένο service_package
   ΑΛΛΑ έχει management_fee_per_apartment > 0
   ΤΟΤΕ ορίζει management_fee_per_apartment = 0

2. ΑΝ το Building έχει service_package
   ΤΟΤΕ συγχρονίζει το management_fee_per_apartment με το service_package.fee_per_apartment

Ημερομηνία: 19 Νοεμβρίου 2025
"""

import os
import django
import sys

sys.path.insert(0, '/home/theo/project/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from decimal import Decimal
from buildings.models import Building, ServicePackage

def fix_management_fees():
    """Διορθώνει τα management fees για buildings χωρίς service package"""
    
    print("\n" + "="*80)
    print("ΔΙΟΡΘΩΣΗ MANAGEMENT FEES ΧΩΡΙΣ SERVICE PACKAGE")
    print("="*80)
    
    buildings = Building.objects.all()
    total_buildings = buildings.count()
    
    print(f"\n📊 Σύνολο Buildings: {total_buildings}")
    
    # Στατιστικά
    with_package = 0
    without_package = 0
    fixed = 0
    already_zero = 0
    synced = 0
    
    print("\n" + "-"*80)
    print("ΑΝΑΛΥΣΗ ΚΑΙ ΔΙΟΡΘΩΣΕΙΣ:")
    print("-"*80)
    
    for building in buildings:
        print(f"\n🏢 Building: {building.name} (ID: {building.id})")
        print(f"   Service Package: {building.service_package.name if building.service_package else 'ΔΕΝ ΥΠΑΡΧΕΙ'}")
        print(f"   Current management_fee_per_apartment: €{building.management_fee_per_apartment}")
        
        if building.service_package:
            # Έχει service package - συγχρονίζουμε το fee
            with_package += 1
            expected_fee = building.service_package.fee_per_apartment
            
            if building.management_fee_per_apartment != expected_fee:
                print(f"   ⚠️  ΑΣΥΝΕΠΕΙΑ! Service package fee: €{expected_fee}")
                print(f"   🔧 Συγχρονισμός: €{building.management_fee_per_apartment} → €{expected_fee}")
                building.management_fee_per_apartment = expected_fee
                building.save()
                synced += 1
                print(f"   ✅ Συγχρονίστηκε!")
            else:
                print(f"   ✅ OK - Συγχρονισμένο με service package")
        else:
            # ΔΕΝ έχει service package
            without_package += 1
            
            if building.management_fee_per_apartment > 0:
                print(f"   ❌ ΠΡΟΒΛΗΜΑ! Έχει management fee αλλά ΔΕΝ έχει service package")
                print(f"   🔧 Διόρθωση: €{building.management_fee_per_apartment} → €0.00")
                building.management_fee_per_apartment = Decimal('0.00')
                building.save()
                fixed += 1
                print(f"   ✅ Διορθώθηκε!")
            else:
                already_zero += 1
                print(f"   ✅ OK - Ήδη €0.00")
    
    # Σύνοψη
    print("\n" + "="*80)
    print("ΣΥΝΟΨΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ")
    print("="*80)
    print(f"\n📊 Στατιστικά:")
    print(f"   Σύνολο Buildings: {total_buildings}")
    print(f"   ├─ Με Service Package: {with_package}")
    print(f"   │  └─ Συγχρονίστηκαν: {synced}")
    print(f"   └─ Χωρίς Service Package: {without_package}")
    print(f"      ├─ Διορθώθηκαν (→ €0): {fixed}")
    print(f"      └─ Ήδη €0: {already_zero}")
    
    if fixed > 0:
        print(f"\n✅ Διορθώθηκαν {fixed} building(s)!")
        print(f"   Πλέον δεν θα χρεώνονται management fees από fallback logic.")
    
    if synced > 0:
        print(f"\n🔄 Συγχρονίστηκαν {synced} building(s) με το service package!")
    
    if fixed == 0 and synced == 0:
        print(f"\n✅ Όλα τα buildings είναι ήδη σωστά!")
    
    print("\n" + "="*80 + "\n")

def show_current_status():
    """Εμφανίζει την τρέχουσα κατάσταση χωρίς αλλαγές"""
    
    print("\n" + "="*80)
    print("ΤΡΕΧΟΥΣΑ ΚΑΤΑΣΤΑΣΗ MANAGEMENT FEES")
    print("="*80)
    
    buildings = Building.objects.all()
    
    print("\n┌─────────────────────────────────────────────────────────────────────┐")
    print("│ Building Name              │ Service Package │ Fee/Apt │ Status    │")
    print("├─────────────────────────────────────────────────────────────────────┤")
    
    for building in buildings:
        name = building.name[:25].ljust(25)
        package = building.service_package.name[:15] if building.service_package else "N/A"
        package = package.ljust(15)
        fee = f"€{building.management_fee_per_apartment}".ljust(7)
        
        # Έλεγχος κατάστασης
        if building.service_package:
            if building.management_fee_per_apartment == building.service_package.fee_per_apartment:
                status = "✅ OK"
            else:
                status = "⚠️  ΑΣΥΝ"
        else:
            if building.management_fee_per_apartment > 0:
                status = "❌ FIX"
            else:
                status = "✅ OK"
        
        print(f"│ {name} │ {package} │ {fee} │ {status.ljust(9)} │")
    
    print("└─────────────────────────────────────────────────────────────────────┘")
    
    print("\nΛεζάντα:")
    print("  ✅ OK    - Σωστή κατάσταση")
    print("  ⚠️  ΑΣΥΝ - Ασυνέπεια με service package (χρειάζεται συγχρονισμός)")
    print("  ❌ FIX  - Έχει fee αλλά όχι package (χρειάζεται μηδενισμός)")
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Διόρθωση management fees για buildings χωρίς service package'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Εμφάνιση τρέχουσας κατάστασης χωρίς αλλαγές'
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Εφαρμογή διορθώσεων'
    )
    
    args = parser.parse_args()
    
    if args.fix:
        # Εφαρμογή διορθώσεων
        fix_management_fees()
    elif args.dry_run:
        # Μόνο εμφάνιση
        show_current_status()
    else:
        # Default: εμφάνιση και ερώτηση
        show_current_status()
        
        print("\n❓ Θέλεις να εφαρμόσεις τις διορθώσεις;")
        print("   python fix_management_fees_without_service_package.py --fix")
        print("\n   ή για να δεις μόνο την κατάσταση:")
        print("   python fix_management_fees_without_service_package.py --dry-run")

