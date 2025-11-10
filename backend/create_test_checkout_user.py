#!/usr/bin/env python
"""
Create a test user for checkout testing
- Email verified
- No tenant
- Ready to subscribe
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context, get_public_schema_name
from users.models import CustomUser
import logging

logger = logging.getLogger(__name__)

def create_test_user():
    """Create test user for checkout"""
    
    email = "test-stripe-checkout@example.com"
    password = "Stripe123!"
    
    print("=" * 70)
    print("  🧪 CREATING TEST CHECKOUT USER")
    print("=" * 70)
    print()
    
    with schema_context(get_public_schema_name()):
        # Check if user exists
        if CustomUser.objects.filter(email=email).exists():
            print(f"⚠️  User {email} already exists. Deleting...")
            CustomUser.objects.filter(email=email).delete()
        
        # Create user
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name="Test",
            last_name="Checkout",
            is_active=True,
            email_verified=True,  # Auto-verify for testing
            tenant=None,  # No tenant - ready to subscribe
            role=None
        )
        
        print(f"✅ Created test user:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Email Verified: {user.email_verified}")
        print(f"   Has Tenant: {user.tenant is not None}")
        print()
        print("=" * 70)
        print("  🎯 READY FOR CHECKOUT TESTING!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("  1. Go to: https://linux-version.vercel.app/login")
        print(f"  2. Login with: {email} / {password}")
        print("  3. You'll be redirected to /plans")
        print("  4. Select a plan and test Stripe checkout")
        print()

if __name__ == '__main__':
    create_test_user()

