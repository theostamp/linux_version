#!/usr/bin/env python
"""
Check which tenant domains exist in the database
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client, Domain

print("=" * 80)
print("TENANT DOMAINS CHECK")
print("=" * 80)
print()

# Get all tenants
tenants = Client.objects.all().order_by('schema_name')

for tenant in tenants:
    print(f"📋 Tenant: {tenant.name}")
    print(f"   Schema: {tenant.schema_name}")
    print(f"   ID: {tenant.id}")
    
    # Get all domains for this tenant
    domains = Domain.objects.filter(tenant=tenant)
    print(f"   Domains:")
    for domain in domains:
        print(f"      - {domain.domain} (primary: {domain.is_primary})")
    print()

print("=" * 80)
print(f"Total tenants: {Client.objects.count()}")
print("=" * 80)















