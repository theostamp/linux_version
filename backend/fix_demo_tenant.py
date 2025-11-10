#!/usr/bin/env python3
"""
Fix Demo Tenant Configuration
============================
This script checks if the demo tenant exists and creates it with proper domain configuration.
Must be run inside Docker container with proper Django setup.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Client, Domain
from django.db import connection

def check_tenant_status():
    """Check current tenant configuration"""
    print("🔍 Checking Demo Tenant Configuration...")
    print("=" * 50)
    
    # Check if demo tenant exists
    try:
        demo_client = Client.objects.get(schema_name='demo')
        print(f"✅ Demo tenant exists: {demo_client.name}")
        print(f"   - Schema: {demo_client.schema_name}")
        print(f"   - Active: {demo_client.is_active}")
        print(f"   - Created: {demo_client.created_on}")
        
        # Check domains
        domains = Domain.objects.filter(tenant=demo_client)
        print(f"\n📡 Configured domains ({domains.count()}):")
        for domain in domains:
            print(f"   - {domain.domain} (primary: {domain.is_primary})")
            
        return demo_client, domains
        
    except Client.DoesNotExist:
        print("❌ Demo tenant does not exist")
        return None, []

def create_demo_tenant():
    """Create demo tenant with proper domain configuration"""
    print("\n🏗️ Creating Demo Tenant...")
    print("-" * 30)
    
    # Create tenant
    demo_client = Client.objects.create(
        schema_name='demo',
        name='Demo Building Management',
        is_active=True,
        on_trial=True,
        trial_days=365  # Extended trial for demo
    )
    print(f"✅ Created tenant: {demo_client.name}")
    
    # Create domains
    domains_to_create = [
        ('demo.localhost', True),   # Primary domain
        ('localhost', False),       # Secondary domain
    ]
    
    created_domains = []
    for domain_name, is_primary in domains_to_create:
        domain = Domain.objects.create(
            domain=domain_name,
            tenant=demo_client,
            is_primary=is_primary
        )
        created_domains.append(domain)
        print(f"✅ Created domain: {domain_name} (primary: {is_primary})")
    
    return demo_client, created_domains

def fix_domain_configuration(demo_client):
    """Fix domain configuration for existing tenant"""
    print("\n🔧 Fixing Domain Configuration...")
    print("-" * 35)
    
    # Check if demo.localhost domain exists
    demo_localhost_exists = Domain.objects.filter(
        tenant=demo_client, 
        domain='demo.localhost'
    ).exists()
    
    if not demo_localhost_exists:
        # Create demo.localhost domain
        domain = Domain.objects.create(
            domain='demo.localhost',
            tenant=demo_client,
            is_primary=True
        )
        print(f"✅ Added missing domain: demo.localhost")
        
        # Make sure localhost is not primary if demo.localhost exists
        localhost_domains = Domain.objects.filter(
            tenant=demo_client,
            domain='localhost'
        )
        if localhost_domains.exists():
            localhost_domains.update(is_primary=False)
            print("✅ Updated localhost to non-primary")
    else:
        print("✅ demo.localhost domain already exists")

def test_tenant_access():
    """Test if we can access the demo tenant schema"""
    print("\n🧪 Testing Tenant Schema Access...")
    print("-" * 35)
    
    try:
        with schema_context('demo'):
            with connection.cursor() as cursor:
                cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'demo'")
                result = cursor.fetchone()
                if result:
                    print("✅ Demo schema exists and is accessible")
                    return True
                else:
                    print("❌ Demo schema not found")
                    return False
    except Exception as e:
        print(f"❌ Error accessing demo schema: {e}")
        return False

def main():
    """Main execution function"""
    print("🚀 Demo Tenant Configuration Fix")
    print("=" * 50)
    
    # Check current status
    demo_client, domains = check_tenant_status()
    
    if demo_client is None:
        # Create new tenant
        demo_client, domains = create_demo_tenant()
    else:
        # Fix existing tenant domains
        fix_domain_configuration(demo_client)
    
    # Test schema access
    schema_accessible = test_tenant_access()
    
    # Final status
    print("\n📋 Final Configuration:")
    print("-" * 25)
    demo_client, domains = check_tenant_status()
    
    print(f"\n🎯 Status Summary:")
    print(f"   - Tenant exists: ✅")
    print(f"   - Schema accessible: {'✅' if schema_accessible else '❌'}")
    print(f"   - Domains configured: {domains.count()}")
    print(f"   - demo.localhost ready: {'✅' if any(d.domain == 'demo.localhost' for d in domains) else '❌'}")
    
    if all([
        demo_client is not None,
        schema_accessible,
        any(d.domain == 'demo.localhost' for d in domains)
    ]):
        print("\n🎉 Demo tenant configuration is ready!")
        print("   Frontend should now be able to connect to demo.localhost:8000")
    else:
        print("\n⚠️ Some issues remain. Check the output above.")

if __name__ == '__main__':
    main()
