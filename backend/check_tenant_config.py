#!/usr/bin/env python3
"""
Check tenant configuration and domains
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client, Domain

def check_tenant_config():
    """Check tenant configuration"""
    print("🔍 Checking Tenant Configuration...")
    print("=" * 50)
    
    try:
        # Check clients (tenants)
        print("1. Available Tenants (Clients):")
        clients = Client.objects.all()
        for client in clients:
            print(f"   - Schema: {client.schema_name}")
            print(f"     Name: {client.name}")
            print(f"     Created: {client.created_on}")
            print(f"     Active: {client.is_active}")
            print()
        
        # Check domains
        print("2. Available Domains:")
        domains = Domain.objects.all()
        for domain in domains:
            print(f"   - Domain: {domain.domain}")
            print(f"     Tenant: {domain.tenant.schema_name}")
            print(f"     Primary: {domain.is_primary}")
            print()
        
        # Check demo tenant specifically
        print("3. Demo Tenant Details:")
        try:
            demo_client = Client.objects.get(schema_name='demo')
            print(f"   Schema: {demo_client.schema_name}")
            print(f"   Name: {demo_client.name}")
            
            demo_domains = Domain.objects.filter(tenant=demo_client)
            print(f"   Domains ({demo_domains.count()}):")
            for domain in demo_domains:
                print(f"     - {domain.domain} (primary: {domain.is_primary})")
        except Client.DoesNotExist:
            print("   ❌ Demo client not found!")
            
    except Exception as e:
        print(f"❌ Error checking tenant config: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_tenant_config()
