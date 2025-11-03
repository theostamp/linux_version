#!/usr/bin/env python
"""Check tenants and users in Railway database"""
import os
import sys
import django

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client, Domain
from users.models import CustomUser
from django_tenants.utils import schema_exists

print('\n' + '='*60)
print('TENANT DATABASE CHECK')
print('='*60)

# Check tenants
tenants = Client.objects.all().order_by('-created_on')
print(f'\n📊 Total Tenants: {tenants.count()}')

for tenant in tenants:
    print(f'\n🏢 Tenant: {tenant.schema_name}')
    print(f'   Name: {tenant.name}')
    print(f'   Created: {tenant.created_on}')
    
    # Check domains
    domains = Domain.objects.filter(tenant=tenant)
    print(f'   Domains ({domains.count()}):')
    for domain in domains:
        primary = '(primary)' if domain.is_primary else ''
        print(f'      - {domain.domain} {primary}')
    
    # Check if schema exists
    exists = schema_exists(tenant.schema_name)
    print(f'   Schema exists: {exists}')

# Check users
print(f'\n👥 Total Users: {CustomUser.objects.count()}')
users = CustomUser.objects.all().order_by('-date_joined')[:10]
for user in users:
    tenant_name = user.tenant.schema_name if user.tenant else None
    print(f'\n   {user.email}')
    print(f'      Tenant: {tenant_name}')
    print(f'      Active: {user.is_active}')
    print(f'      Staff: {user.is_staff}')

print('\n' + '='*60)

