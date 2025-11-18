#!/usr/bin/env python3
"""
Script για τη διαγραφή του κτιρίου "Σόλωνος 8" από τη βάση δεδομένων
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

def delete_solonos_building():
    """Διαγραφή κτιρίου Σόλωνος 8"""
    
    print("🗑️  ΔΙΑΓΡΑΦΗ ΚΤΙΡΙΟΥ ΣΟΛΩΝΟΣ 8")
    print("=" * 50)
    
    # Ελέγχουμε σε όλα τα tenants
    from tenants.models import Client
    
    deleted_count = 0
    
    for tenant in Client.objects.all():
        with schema_context(tenant.schema_name):
            try:
                # Αναζήτηση με διαφορετικές παραλλαγές του ονόματος
                buildings_to_delete = Building.objects.filter(
                    name__icontains='Σόλωνος'
                )
                
                if buildings_to_delete.exists():
                    print(f"\n📋 Tenant: {tenant.schema_name}")
                    for building in buildings_to_delete:
                        print(f"   - Βρέθηκε: {building.name} (ID: {building.id})")
                        # Διαγραφή όλων των σχετικών δεδομένων
                        building.delete()
                        print(f"   ✅ Διαγράφηκε: {building.name}")
                        deleted_count += 1
                else:
                    print(f"\n✓ Tenant: {tenant.schema_name} - Δεν βρέθηκε κτίριο Σόλωνος")
                    
            except Exception as e:
                print(f"\n❌ Σφάλμα στο tenant {tenant.schema_name}: {e}")
    
    print("\n" + "=" * 50)
    if deleted_count > 0:
        print(f"✅ Διαγράφηκαν {deleted_count} κτίρια")
    else:
        print("ℹ️  Δεν βρέθηκαν κτίρια για διαγραφή")
    print("=" * 50)

if __name__ == "__main__":
    delete_solonos_building()

