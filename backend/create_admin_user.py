#!/usr/bin/env python
"""
Script to create admin user for demo.localhost
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

def create_admin_user():
    """Create admin@demo.localhost user"""
    with schema_context('demo'):
        # Create admin@demo.localhost user
        user, created = CustomUser.objects.update_or_create(
            email='admin@demo.localhost',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'role': 'admin'
            }
        )

        if created:
            user.set_password('admin123')
            user.save()
            print(f"✅ Created admin user: {user.email}")
        else:
            user.set_password('admin123')
            user.save()
            print(f"✅ Updated admin user: {user.email}")

        return user

if __name__ == '__main__':
    create_admin_user()
    print("\n🎉 Admin user is ready!")
    print("📧 Email: admin@demo.localhost")
    print("🔑 Password: admin123")