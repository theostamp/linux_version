#!/usr/bin/env python
"""
Script για να τρέξει migrations σε όλα τα tenant schemas.
Χρησιμοποιείται όταν χρειάζεται να εφαρμοστούν migrations σε όλους τους tenants.
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import call_command
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Client


def run_migrations():
    """Τρέχει migrations σε shared schema και σε όλα τα tenant schemas"""
    
    print("=" * 60)
    print("🚀 Starting Migration Process")
    print("=" * 60)
    
    # 1. Migrate shared schema
    print("\n📦 Step 1: Migrating SHARED schema...")
    try:
        call_command('migrate_schemas', '--shared', verbosity=2)
        print("✅ Shared schema migrations completed successfully")
    except Exception as e:
        print(f"❌ Error migrating shared schema: {e}")
        sys.exit(1)
    
    # 2. Migrate all tenant schemas
    print("\n🏢 Step 2: Migrating TENANT schemas...")
    
    # Get all tenants
    tenants = Client.objects.exclude(schema_name=get_public_schema_name())
    tenant_count = tenants.count()
    
    if tenant_count == 0:
        print("⚠️  No tenant schemas found. Skipping tenant migrations.")
        return
    
    print(f"📊 Found {tenant_count} tenant(s) to migrate")
    
    success_count = 0
    failed_tenants = []
    
    for tenant in tenants:
        print(f"\n  🔄 Migrating tenant: {tenant.name} (schema: {tenant.schema_name})")
        try:
            with schema_context(tenant.schema_name):
                call_command('migrate', verbosity=1)
            print(f"  ✅ {tenant.name} migrated successfully")
            success_count += 1
        except Exception as e:
            print(f"  ❌ Error migrating {tenant.name}: {e}")
            failed_tenants.append((tenant.name, str(e)))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Migration Summary")
    print("=" * 60)
    print(f"✅ Successful: {success_count}/{tenant_count}")
    
    if failed_tenants:
        print(f"❌ Failed: {len(failed_tenants)}")
        print("\nFailed tenants:")
        for tenant_name, error in failed_tenants:
            print(f"  - {tenant_name}: {error}")
        sys.exit(1)
    else:
        print("🎉 All migrations completed successfully!")
        print("=" * 60)


if __name__ == '__main__':
    run_migrations()



