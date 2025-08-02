#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.hashers import make_password, check_password

User = get_user_model()

def check_user():
    """Check if the user exists and verify their credentials"""
    email = 'theostam1966@gmail.com'
    password = 'admin123'
    
    print("🔍 Checking user in database...")
    
    # Check if user exists
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Is active: {user.is_active}")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Is superuser: {user.is_superuser}")
        print(f"   First name: {user.first_name}")
        print(f"   Last name: {user.last_name}")
        
        # Check password
        if user.check_password(password):
            print("✅ Password is correct")
        else:
            print("❌ Password is incorrect")
            # Set the password again
            user.set_password(password)
            user.save()
            print("✅ Password has been reset")
        
        # Test authentication
        print("\n🔐 Testing authentication...")
        auth_user = authenticate(email=email, password=password)
        if auth_user:
            print("✅ Authentication successful")
        else:
            print("❌ Authentication failed")
            
    except User.DoesNotExist:
        print(f"❌ User {email} not found in database")
        
        # Create the user
        print("Creating user...")
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='Theo',
            last_name='Stam'
        )
        print(f"✅ User created: {user.email}")
        
        # Test authentication
        print("\n🔐 Testing authentication...")
        auth_user = authenticate(email=email, password=password)
        if auth_user:
            print("✅ Authentication successful")
        else:
            print("❌ Authentication failed")

if __name__ == "__main__":
    check_user() 