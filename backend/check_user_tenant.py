#!/usr/bin/env python3
"""
Check user tenant relationship for debugging
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from users.models import CustomUser
from tenants.models import Client, Domain

def check_user_tenant():
    """Check user-tenant relationships"""
    print("🔍 Checking User-Tenant Relationships...")
    print("=" * 50)
    
    # Find user
    email = 'etherm2021@gmail.com'
    
    with schema_context('public'):
        try:
            user = CustomUser.objects.get(email=email)
            print(f"✅ Found user: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Username: {user.username}")
            print(f"   Tenant: {user.tenant}")
            print(f"   Tenant Schema: {user.tenant.schema_name if user.tenant else 'None'}")
            print()
            
            # Check all tenants
            print("📊 All Tenants:")
            for tenant in Client.objects.all():
                print(f"   - {tenant.schema_name} ({tenant.name})")
                
                # Check domains for this tenant
                domains = Domain.objects.filter(tenant=tenant)
                for domain in domains:
                    print(f"     Domain: {domain.domain}")
                    
                # Check users for this tenant
                tenant_users = CustomUser.objects.filter(tenant=tenant)
                for tu in tenant_users:
                    print(f"     User: {tu.email}")
            print()
            
            # Check for similar schema names
            print("🔍 Looking for similar schema names:")
            similar_schemas = ['etherm', 'etherm2021', 'etherm-2021']
            for schema in similar_schemas:
                exists = Client.objects.filter(schema_name=schema).exists()
                print(f"   {schema}: {'✅ EXISTS' if exists else '❌ NOT FOUND'}")
                if exists:
                    tenant = Client.objects.get(schema_name=schema)
                    domains = Domain.objects.filter(tenant=tenant)
                    print(f"     Domains: {', '.join([d.domain for d in domains])}")
            
        except CustomUser.DoesNotExist:
            print(f"❌ User {email} not found")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    check_user_tenant()
