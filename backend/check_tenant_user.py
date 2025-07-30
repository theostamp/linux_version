#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Client, Domain

User = get_user_model()

def check_tenant_setup():
    """Check tenant setup and user existence"""
    print("🔍 Checking tenant setup...")
    
    # Check public tenant
    try:
        public_tenant = Client.objects.get(schema_name='public')
        print(f"✅ Public tenant found: {public_tenant.name}")
        
        # Check domains
        domains = Domain.objects.filter(tenant=public_tenant)
        for domain in domains:
            print(f"   Domain: {domain.domain} (primary: {domain.is_primary})")
            
    except Client.DoesNotExist:
        print("❌ Public tenant not found")
        return
    
    # Check user in public schema
    print("\n👤 Checking user in public schema...")
    with schema_context('public'):
        try:
            user = User.objects.get(email='theostam1966@gmail.com')
            print(f"✅ User found in public schema: {user.email}")
            print(f"   Is active: {user.is_active}")
            print(f"   Is staff: {user.is_staff}")
            print(f"   Is superuser: {user.is_superuser}")
            
            # Test authentication in public schema
            auth_user = authenticate(email='theostam1966@gmail.com', password='admin123')
            if auth_user:
                print("✅ Authentication successful in public schema")
            else:
                print("❌ Authentication failed in public schema")
                
        except User.DoesNotExist:
            print("❌ User not found in public schema")
            
            # Create user in public schema
            print("Creating user in public schema...")
            user = User.objects.create_superuser(
                email='theostam1966@gmail.com',
                password='admin123',
                first_name='Theo',
                last_name='Stam'
            )
            print(f"✅ User created in public schema: {user.email}")
    
    # Check if there are other tenants
    print("\n🏢 Checking other tenants...")
    tenants = Client.objects.exclude(schema_name='public')
    if tenants.exists():
        for tenant in tenants:
            print(f"Tenant: {tenant.name} (schema: {tenant.schema_name})")
            domains = Domain.objects.filter(tenant=tenant)
            for domain in domains:
                print(f"   Domain: {domain.domain}")
    else:
        print("No other tenants found")

if __name__ == "__main__":
    check_tenant_setup() 