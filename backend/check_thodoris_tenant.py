#!/usr/bin/env python3
"""
Diagnostic script to check if 'thodoris' tenant exists and is properly configured
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

def check_thodoris_tenant():
    """Check if 'thodoris' tenant exists and is properly configured"""
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    User = get_user_model()

    print("\n" + "="*60)
    print("THODORIS TENANT DIAGNOSTIC")
    print("="*60)

    # Check if 'thodoris' tenant exists
    print("\n1️⃣ Checking for 'thodoris' tenant...")
    try:
        tenant = TenantModel.objects.get(schema_name='thodoris')
        print(f"   ✅ Tenant found: {tenant.schema_name}")
        print(f"      Name: {tenant.name}")
        print(f"      Created: {tenant.created_on}")
        print(f"      Active: {getattr(tenant, 'is_active', 'N/A')}")
    except TenantModel.DoesNotExist:
        print("   ❌ Tenant 'thodoris' NOT FOUND in database")
        print("   🔧 This is likely the ROOT CAUSE of 404 errors")
        print("\n   SOLUTION: Create tenant using subscription flow")
        tenant = None

    if tenant:
        # Check domain mappings
        print("\n2️⃣ Checking domain mappings...")
        domains = DomainModel.objects.filter(tenant=tenant)
        if domains.exists():
            print(f"   ✅ Found {domains.count()} domain(s):")
            for domain in domains:
                primary_marker = " (PRIMARY)" if domain.is_primary else ""
                print(f"      - {domain.domain}{primary_marker}")

            # Check for specific domain
            expected_domain = 'thodoris.newconcierge.app'
            if DomainModel.objects.filter(tenant=tenant, domain=expected_domain).exists():
                print(f"   ✅ Expected domain '{expected_domain}' found")
            else:
                print(f"   ⚠️  Expected domain '{expected_domain}' NOT found")
                print(f"   🔧 May need to add domain mapping")
        else:
            print("   ❌ NO domains mapped to tenant")
            print("   🔧 This will cause routing failures")

        # Check users for this tenant
        print("\n3️⃣ Checking users in tenant...")
        users = User.objects.filter(tenant=tenant)
        if users.exists():
            print(f"   ✅ Found {users.count()} user(s):")
            for user in users[:5]:
                print(f"      - {user.email} (Active: {user.is_active})")
        else:
            print("   ⚠️  No users found for this tenant")

    # Check all tenants for comparison
    print("\n4️⃣ All tenants in system:")
    all_tenants = TenantModel.objects.all().order_by('schema_name')
    for t in all_tenants:
        domains_count = DomainModel.objects.filter(tenant=t).count()
        users_count = User.objects.filter(tenant=t).count()
        print(f"   - {t.schema_name}: {domains_count} domain(s), {users_count} user(s)")

    # Test tenant resolution from header
    print("\n5️⃣ Testing tenant resolution from X-Tenant-Schema header...")
    test_values = ['thodoris', 'thodoris.newconcierge.app']

    for test_value in test_values:
        print(f"\n   Testing with X-Tenant-Schema: '{test_value}'")

        # Try schema_name lookup
        try:
            found_tenant = TenantModel.objects.get(schema_name=test_value)
            print(f"      ✅ Found by schema_name: {found_tenant.schema_name}")
        except TenantModel.DoesNotExist:
            print(f"      ❌ Not found by schema_name")

        # Try domain lookup
        try:
            domain = DomainModel.objects.filter(domain__icontains=test_value).first()
            if domain:
                print(f"      ✅ Found by domain: {domain.domain} → {domain.tenant.schema_name}")
            else:
                print(f"      ❌ Not found by domain")
        except Exception as e:
            print(f"      ❌ Domain lookup error: {e}")

    print("\n" + "="*60)
    print("DIAGNOSTIC COMPLETE")
    print("="*60 + "\n")

    # Summary
    if not tenant:
        print("🔴 CRITICAL ISSUE: Tenant 'thodoris' does not exist")
        print("\nREQUIRED ACTION:")
        print("1. Verify subscription payment was processed")
        print("2. Check tenant creation callback from Stripe")
        print("3. Manually create tenant if needed:")
        print("   docker exec -it linux_version-backend-1 python manage.py create_tenant")
    elif not DomainModel.objects.filter(tenant=tenant, domain='thodoris.newconcierge.app').exists():
        print("⚠️  WARNING: Domain mapping may be incomplete")
        print("\nREQUIRED ACTION:")
        print("1. Add domain: thodoris.newconcierge.app")
        print("2. Restart backend: docker-compose restart backend")
    else:
        print("✅ Tenant configuration looks correct")
        print("\nIf still getting 404s, check:")
        print("1. Backend logs for middleware errors")
        print("2. Frontend NEXT_PUBLIC_API_URL setting")
        print("3. Vercel deployment configuration")

if __name__ == '__main__':
    check_thodoris_tenant()
