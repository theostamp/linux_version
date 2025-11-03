#!/usr/bin/env python3
"""
Check what tenants exist in the database
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

# For local execution, use Railway DB credentials
if 'RAILWAY_ENVIRONMENT' not in os.environ:
    os.environ['PGHOST'] = 'caboose.proxy.rlwy.net'
    os.environ['PGPORT'] = '58251'
    os.environ['PGDATABASE'] = 'railway'
    os.environ['PGUSER'] = 'postgres'
    # PGPASSWORD should be set in environment

django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model
from django.contrib.auth import get_user_model

def check_tenants():
    """Check what tenants and users exist"""
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    User = get_user_model()
    
    print("\n" + "="*60)
    print("TENANT DATABASE CHECK")
    print("="*60)
    
    # Check tenants
    tenants = TenantModel.objects.all().order_by('-created_on')
    print(f"\n📊 Total Tenants: {tenants.count()}")
    print("-" * 60)
    
    for tenant in tenants:
        print(f"\n🏢 Tenant: {tenant.schema_name}")
        print(f"   Name: {tenant.name}")
        print(f"   Created: {tenant.created_on}")
        print(f"   Active: {tenant.is_active if hasattr(tenant, 'is_active') else 'N/A'}")
        
        # Check domains for this tenant
        domains = DomainModel.objects.filter(tenant=tenant)
        print(f"   Domains ({domains.count()}):")
        for domain in domains:
            print(f"      - {domain.domain} {'(primary)' if domain.is_primary else ''}")
    
    # Check users in public schema
    print(f"\n👥 Total Users (public schema): {User.objects.count()}")
    print("-" * 60)
    
    users = User.objects.all().order_by('-date_joined')[:5]
    for user in users:
        tenant_name = getattr(user.tenant, 'schema_name', 'None') if user.tenant else 'None'
        print(f"\n   Email: {user.email}")
        print(f"   Username: {user.username if hasattr(user, 'username') else 'N/A'}")
        print(f"   Tenant: {tenant_name}")
        print(f"   Active: {user.is_active}")
        print(f"   Staff: {user.is_staff}")
        print(f"   Superuser: {user.is_superuser}")
    
    print("\n" + "="*60)
    print("CHECK COMPLETE")
    print("="*60 + "\n")

if __name__ == '__main__':
    check_tenants()

