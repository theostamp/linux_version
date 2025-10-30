#!/usr/bin/env python3
"""
Script to check user data in the database.
This helps debug authentication issues.
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append('/home/theo/project/linux_version/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection

def check_users():
    """Check users in the database."""
    print("🔍 Checking users in the database...")
    print(f"Current schema: {connection.schema_name}")
    
    User = get_user_model()
    
    # Get all users
    users = User.objects.all()
    print(f"Total users found: {users.count()}")
    
    for user in users:
        print(f"  - ID: {user.id}, Email: {user.email}, Active: {user.is_active}")
        if hasattr(user, 'tenant'):
            print(f"    Tenant: {getattr(user.tenant, 'schema_name', 'None')}")
    
    # Check specific user
    test_email = "etherm2021@gmail.com"
    try:
        user = User.objects.get(email=test_email)
        print(f"\n✅ User found: {user.email}")
        print(f"  - ID: {user.id}")
        print(f"  - Active: {user.is_active}")
        print(f"  - Staff: {user.is_staff}")
        print(f"  - Superuser: {user.is_superuser}")
        if hasattr(user, 'tenant'):
            print(f"  - Tenant: {getattr(user.tenant, 'schema_name', 'None')}")
        
        # Test password
        test_password = "test_password"  # You'll need to provide the actual password
        password_valid = user.check_password(test_password)
        print(f"  - Password valid: {password_valid}")
        
    except User.DoesNotExist:
        print(f"\n❌ User not found: {test_email}")
    
    # Check authentication backends
    from django.conf import settings
    print(f"\n🔧 Authentication backends: {settings.AUTHENTICATION_BACKENDS}")

if __name__ == "__main__":
    check_users()


