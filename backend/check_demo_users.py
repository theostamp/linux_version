#!/usr/bin/env python3
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from django.contrib.auth import get_user_model

User = get_user_model()

try:
    demo = Client.objects.get(schema_name='demo')
    print(f'Found demo tenant: {demo.name}')
    
    with tenant_context(demo):
        users = User.objects.all()
        print(f'Found {users.count()} users in demo tenant')
        
        for user in users[:10]:  # Show first 10 users
            print(f'User: {user.email}, is_active: {user.is_active}, is_staff: {user.is_staff}')
            
except Client.DoesNotExist:
    print('Demo tenant not found')
except Exception as e:
    print(f'Error: {e}')
