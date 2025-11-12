#!/usr/bin/env python
"""
Check tenant 'theo' and create demo data if missing
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

print("=" * 80)
print("TENANT 'THEO' STATUS CHECK")
print("=" * 80)
print()

# Check if tenant exists
TenantModel = get_tenant_model()

try:
    tenant = TenantModel.objects.get(schema_name='theo')
    print(f"✅ Tenant found:")
    print(f"   Schema: {tenant.schema_name}")
    print(f"   Name: {tenant.name}")
    print(f"   ID: {tenant.id}")
    print(f"   Active: {tenant.is_active}")
    print()
    
    # Check what's in the tenant schema
    with schema_context('theo'):
        from buildings.models import Building
        from apartments.models import Apartment
        from users.models import CustomUser
        
        building_count = Building.objects.count()
        apartment_count = Apartment.objects.count()
        user_count = CustomUser.objects.count()
        
        print(f"📊 Current Data:")
        print(f"   Buildings: {building_count}")
        print(f"   Apartments: {apartment_count}")
        print(f"   Users: {user_count}")
        print()
        
        if building_count == 0:
            print("⚠️ No buildings found! Creating demo data...")
            print()
            
            # Create demo data
            tenant_service = TenantService()
            tenant_service._create_demo_data('theo')
            
            # Verify
            building_count = Building.objects.count()
            apartment_count = Apartment.objects.count()
            
            print(f"✅ Demo data created!")
            print(f"   Buildings: {building_count}")
            print(f"   Apartments: {apartment_count}")
            print()
        else:
            print(f"✅ Tenant has buildings:")
            for building in Building.objects.all():
                print(f"   - {building.name} ({building.total_apartments} apartments)")
            print()

except TenantModel.DoesNotExist:
    print("❌ Tenant 'theo' not found in database!")
    print()
    print("Available tenants:")
    for tenant in TenantModel.objects.all():
        print(f"  - {tenant.schema_name} ({tenant.name})")
    print()

print("=" * 80)


















