#!/usr/bin/env python3

import os
import sys
import django

print("🔧 Starting Django setup...")
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

try:
    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)

from django_tenants.utils import schema_context

print("🔧 Testing tenant context...")

try:
    with schema_context('demo'):
        print("✅ Tenant context successful")
        
        from apartments.models import Apartment
        print("✅ Apartment model imported")
        
        apartments = Apartment.objects.filter(building_id=4)
        print(f"📊 Found {apartments.count()} apartments in building 4")
        
        for apt in apartments:
            print(f"   🏠 Apartment {apt.number}: {apt.owner_name or 'No owner'}")
            
        # Specific check for apartment 3
        try:
            apt3 = Apartment.objects.get(number='3', building_id=4)
            print(f"\n🎯 Apartment 3 found:")
            print(f"   Owner: {apt3.owner_name}")
            print(f"   Tenant: {apt3.tenant_name}")
            print(f"   Current balance: {apt3.current_balance}")
        except Apartment.DoesNotExist:
            print("❌ Apartment 3 not found")

except Exception as e:
    print(f"❌ Error in tenant context: {e}")
    import traceback
    traceback.print_exc()
