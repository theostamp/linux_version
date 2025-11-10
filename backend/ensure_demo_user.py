#!/usr/bin/env python
"""
Script to ensure demo user exists for testing
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
from buildings.models import Building

def ensure_demo_user():
    """Create or update demo user"""
    with schema_context('demo'):
        # Check/create demo user
        user, created = CustomUser.objects.update_or_create(
            email='demo@demo.com',
            defaults={
                'first_name': 'Demo',
                'last_name': 'User',
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'role': 'admin'
            }
        )

        if created:
            user.set_password('demo123')
            user.save()
            print(f"✅ Created demo user: {user.email}")
        else:
            # Update password for existing user
            user.set_password('demo123')
            user.save()
            print(f"✅ Updated demo user: {user.email}")

        # Show building info
        try:
            building = Building.objects.get(pk=1)
            print(f"✅ Building available: {building.name}")
        except Building.DoesNotExist:
            print("⚠️ Warning: Building with ID 1 not found")

        return user

if __name__ == '__main__':
    ensure_demo_user()
    print("\n🎉 Demo user is ready!")
    print("📧 Email: demo@demo.com")
    print("🔑 Password: demo123")
    print("🌐 URL: http://demo.localhost:3001")