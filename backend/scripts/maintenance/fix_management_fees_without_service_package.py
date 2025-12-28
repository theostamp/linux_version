#!/usr/bin/env python
"""
Διόρθωση Management Fees για Buildings χωρίς Service Package (Multi-tenant Aware)

Λογική:
1. Iterate σε όλους τους Tenants
2. Μέσα σε κάθε Tenant schema:
    a. ΑΝ το Building ΔΕΝ έχει επιλεγμένο service_package
       ΑΛΛΑ έχει management_fee_per_apartment > 0
       ΤΟΤΕ ορίζει management_fee_per_apartment = 0
    b. ΑΝ το Building έχει service_package
       ΤΟΤΕ συγχρονίζει το management_fee_per_apartment με το service_package.fee_per_apartment
"""

import os
import django
import sys
from decimal import Decimal

# Setup Django
sys.path.insert(0, '/app') # Railway path
sys.path.insert(0, '/home/theo/project/backend') # Local path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Client
from buildings.models import Building, ServicePackage

def fix_management_fees_for_tenant(tenant, dry_run=False):
    print(f"\n🔍 Checking Tenant: {tenant.name} (Schema: {tenant.schema_name})")
    
    with schema_context(tenant.schema_name):
        buildings = Building.objects.all()
        if not buildings.exists():
            print("   No buildings found.")
            return 0, 0

        fixed = 0
        synced = 0
        
        for building in buildings:
            print(f"\n   🏢 Building: {building.name} (ID: {building.id})")
            package_name = building.service_package.name if building.service_package else 'ΔΕΝ ΥΠΑΡΧΕΙ'
            print(f"      Service Package: {package_name}")
            print(f"      Current fee: €{building.management_fee_per_apartment}")
            
            if building.service_package:
                # Έχει service package - συγχρονίζουμε το fee
                expected_fee = building.service_package.fee_per_apartment
                
                if building.management_fee_per_apartment != expected_fee:
                    print(f"      ⚠️  ΑΣΥΝΕΠΕΙΑ! Service package fee: €{expected_fee}")
                    if not dry_run:
                        print(f"      🔧 Συγχρονισμός: €{building.management_fee_per_apartment} → €{expected_fee}")
                        building.management_fee_per_apartment = expected_fee
                        building.save()
                        synced += 1
                        print(f"      ✅ Συγχρονίστηκε!")
                    else:
                         print(f"      🔧 Θα συγχρονιστεί (Dry Run)")
                else:
                    print(f"      ✅ OK - Συγχρονισμένο")
            else:
                # ΔΕΝ έχει service package
                if building.management_fee_per_apartment > 0:
                    print(f"      ❌ ΠΡΟΒΛΗΜΑ! Έχει management fee αλλά ΔΕΝ έχει service package")
                    if not dry_run:
                        print(f"      🔧 Διόρθωση: €{building.management_fee_per_apartment} → €0.00")
                        building.management_fee_per_apartment = Decimal('0.00')
                        building.save()
                        fixed += 1
                        print(f"      ✅ Διορθώθηκε!")
                    else:
                        print(f"      🔧 Θα διορθωθεί σε €0.00 (Dry Run)")
                else:
                    print(f"      ✅ OK - Ήδη €0.00")
                    
        return fixed, synced

def fix_management_fees(dry_run=False):
    print("\n" + "="*80)
    print("ΔΙΟΡΘΩΣΗ MANAGEMENT FEES (MULTI-TENANT)")
    print("="*80)
    
    tenants = Client.objects.all()
    total_tenants = tenants.count()
    total_fixed = 0
    total_synced = 0
    
    print(f"Found {total_tenants} tenants.")
    
    for tenant in tenants:
        if tenant.schema_name == 'public':
            continue
            
        try:
            f, s = fix_management_fees_for_tenant(tenant, dry_run=dry_run)
            total_fixed += f
            total_synced += s
        except Exception as e:
            print(f"❌ Error processing tenant {tenant.name}: {e}")
    
    # ΣΥΝΟΨΗ
    print("\n" + "="*80)
    print("ΣΥΝΟΨΗ ΑΠΟΤΕΛΕΣΜΑΤΩΝ")
    print("="*80)
    print(f"Σύνολο Tenants: {total_tenants}")
    print(f"Buildings που διορθώθηκαν (fee->0): {total_fixed}")
    print(f"Buildings που συγχρονίστηκαν: {total_synced}")
    
    if total_fixed > 0 or total_synced > 0:
        print(f"\n✅ Ολοκληρώθηκε η διόρθωση!")
    else:
        print(f"\n✅ Όλα φαίνονται σωστά!")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Διόρθωση management fees (Multi-tenant)')
    parser.add_argument('--dry-run', action='store_true', help='Εμφάνιση χωρίς αλλαγές')
    parser.add_argument('--fix', action='store_true', help='Εφαρμογή αλλαγών')
    
    args = parser.parse_args()
    
    if args.fix:
        fix_management_fees(dry_run=False)
    elif args.dry_run:
        fix_management_fees(dry_run=True)
    else:
        fix_management_fees(dry_run=True)
        print("\n❓ Χρησιμοποίησε --fix για να εφαρμόσεις τις αλλαγές")
