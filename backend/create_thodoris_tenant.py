#!/usr/bin/env python3
"""
Create 'thodoris' tenant if it doesn't exist
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model
from django.contrib.auth import get_user_model
from django.db import connection

def create_thodoris_tenant():
    """Create 'thodoris' tenant with proper domain mapping"""
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    User = get_user_model()

    print("\n" + "="*60)
    print("CREATE THODORIS TENANT")
    print("="*60)

    # Check if tenant already exists
    try:
        tenant = TenantModel.objects.get(schema_name='thodoris')
        print(f"\n⚠️  Tenant 'thodoris' already exists!")
        print(f"   Schema: {tenant.schema_name}")
        print(f"   Name: {tenant.name}")
        print(f"   Created: {tenant.created_on}")

        # Check domain mapping
        expected_domain = 'thodoris.newconcierge.app'
        domain = DomainModel.objects.filter(tenant=tenant, domain=expected_domain).first()

        if not domain:
            print(f"\n🔧 Adding missing domain: {expected_domain}")
            domain = DomainModel.objects.create(
                domain=expected_domain,
                tenant=tenant,
                is_primary=True
            )
            print(f"   ✅ Domain added: {domain.domain}")
        else:
            print(f"\n✅ Domain already exists: {domain.domain}")

        return tenant

    except TenantModel.DoesNotExist:
        print("\n📝 Creating new tenant 'thodoris'...")

        # Create tenant
        tenant = TenantModel.objects.create(
            schema_name='thodoris',
            name='Thodoris Building',
            created_on=None  # Will be set by model default
        )
        print(f"   ✅ Tenant created: {tenant.schema_name}")

        # Create domain
        domain = DomainModel.objects.create(
            domain='thodoris.newconcierge.app',
            tenant=tenant,
            is_primary=True
        )
        print(f"   ✅ Domain created: {domain.domain}")

        # Run migrations for tenant schema
        print(f"\n🔧 Running migrations for schema '{tenant.schema_name}'...")
        connection.set_tenant(tenant)

        from django.core.management import call_command
        try:
            call_command('migrate_schemas', schema_name=tenant.schema_name, verbosity=1)
            print(f"   ✅ Migrations complete")
        except Exception as e:
            print(f"   ⚠️  Migration error: {e}")
            print(f"   Run manually: docker exec -it linux_version-backend-1 python manage.py migrate_schemas --schema={tenant.schema_name}")

        print("\n✅ Tenant creation complete!")
        return tenant

if __name__ == '__main__':
    tenant = create_thodoris_tenant()

    print("\n" + "="*60)
    print("NEXT STEPS")
    print("="*60)
    print("\n1️⃣ Create a user for this tenant:")
    print("   docker exec -it linux_version-backend-1 python manage.py shell")
    print("   >>> from users.models import CustomUser")
    print("   >>> from tenants.models import Client")
    print("   >>> tenant = Client.objects.get(schema_name='thodoris')")
    print("   >>> user = CustomUser.objects.create_user(")
    print("   ...     email='admin@thodoris.com',")
    print("   ...     password='secure_password',")
    print("   ...     tenant=tenant")
    print("   ... )")
    print("\n2️⃣ Test the tenant:")
    print("   curl https://thodoris.newconcierge.app/api/users/me \\")
    print("        -H 'Authorization: Bearer <token>' \\")
    print("        -H 'X-Tenant-Schema: thodoris'")
    print("\n3️⃣ Check backend logs:")
    print("   docker logs linux_version-backend-1 -f --tail 100")
    print("\n" + "="*60 + "\n")
