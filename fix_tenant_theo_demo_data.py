#!/usr/bin/env python
"""
Fix tenant 'theo' by creating demo data
Can be adapted for any tenant that's missing demo data
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context, get_tenant_model
from tenants.services import TenantService

TENANT_SCHEMA = 'theo'  # Change this to fix other tenants

print("=" * 80)
print(f"FIXING TENANT '{TENANT_SCHEMA}' - Adding Demo Data")
print("=" * 80)
print()

# Check if tenant exists
TenantModel = get_tenant_model()

try:
    tenant = TenantModel.objects.get(schema_name=TENANT_SCHEMA)
    print(f"✅ Found tenant: {tenant.name} (schema: {tenant.schema_name})")
    print()
    
    # Check current state
    with schema_context(TENANT_SCHEMA):
        from buildings.models import Building
        from apartments.models import Apartment
        
        building_count = Building.objects.count()
        apartment_count = Apartment.objects.count()
        
        print(f"📊 Current State:")
        print(f"   Buildings: {building_count}")
        print(f"   Apartments: {apartment_count}")
        print()
        
        if building_count > 0:
            print("✅ Tenant already has buildings!")
            for building in Building.objects.all():
                apts = Apartment.objects.filter(building=building).count()
                print(f"   - {building.name}: {apts} apartments")
            print()
            print("No action needed.")
            sys.exit(0)
        
        # Create demo data
        print("🏗️ Creating demo data for tenant...")
        print()
        
        tenant_service = TenantService()
        tenant_service._create_demo_data(TENANT_SCHEMA)
        
        # Verify
        building_count = Building.objects.count()
        apartment_count = Apartment.objects.count()
        
        print()
        print("=" * 80)
        print("✅ DEMO DATA CREATED SUCCESSFULLY!")
        print("=" * 80)
        print(f"   Buildings: {building_count}")
        print(f"   Apartments: {apartment_count}")
        print()
        
        for building in Building.objects.all():
            apts = Apartment.objects.filter(building=building).count()
            print(f"   📍 {building.name}")
            print(f"      Address: {building.address}")
            print(f"      Apartments: {apts}")
            print()

except TenantModel.DoesNotExist:
    print(f"❌ Tenant '{TENANT_SCHEMA}' not found in database!")
    print()
    print("Available tenants:")
    for t in TenantModel.objects.all():
        print(f"  - {t.schema_name} ({t.name})")
    print()
    sys.exit(1)

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("=" * 80)
print("🎉 TENANT IS NOW READY!")
print("=" * 80)
print()
print(f"Test at: https://{TENANT_SCHEMA}.newconcierge.app/")
print()















