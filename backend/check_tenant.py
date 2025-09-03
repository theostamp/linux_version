#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building

def check_tenant():
    try:
        # Βρίσκουμε το tenant
        tenant = Client.objects.get(schema_name='tap')
        print(f"✅ Βρέθηκε tenant: {tenant.name}")
        
        # Ελέγχουμε με tenant context
        with tenant_context(tenant):
            buildings_count = Building.objects.count()
            buildings = list(Building.objects.values('name', 'address'))
            print(f"✅ Buildings count: {buildings_count}")
            print(f"✅ Buildings: {buildings}")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    check_tenant() 