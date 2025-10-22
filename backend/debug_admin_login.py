#!/usr/bin/env python
"""
Debug script to test admin login credentials directly in Railway
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
sys.path.insert(0, '/app')
django.setup()

from django.contrib.auth import authenticate
from users.models import User

def test_admin_login():
    """Test if admin user exists and can authenticate"""

    print("=" * 60)
    print("ADMIN LOGIN DEBUG TEST")
    print("=" * 60)

    # Check if user exists
    email = "theostam1966@gmail.com"
    password = "theo123!@#"

    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {email}")
        print(f"   - Is active: {user.is_active}")
        print(f"   - Is staff: {user.is_staff}")
        print(f"   - Is superuser: {user.is_superuser}")
        print(f"   - Date joined: {user.date_joined}")

        # Test authentication
        auth_user = authenticate(username=email, password=password)
        if auth_user:
            print(f"✅ Authentication successful!")
        else:
            print(f"❌ Authentication failed - wrong password?")

            # Try to set the password again
            print("\n🔧 Resetting password...")
            user.set_password(password)
            user.save()
            print("✅ Password has been reset")

            # Test again
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                print("✅ Authentication successful after reset!")
            else:
                print("❌ Still failing - there's a deeper issue")

    except User.DoesNotExist:
        print(f"❌ User NOT found: {email}")
        print("\n🔧 Creating superuser...")
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name="Theo",
            last_name="Stam"
        )
        print(f"✅ Superuser created: {email}")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_admin_login()