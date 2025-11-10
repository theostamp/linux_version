#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django.test import Client
from django.urls import reverse

User = get_user_model()

def debug_admin_login():
    """Debug Django admin login issue"""
    
    print("🔍 DEBUGGING DJANGO ADMIN LOGIN")
    print("=" * 50)
    
    # 1. Check user exists and properties
    email = 'theostam1966@gmail.com'
    password = 'theo123!@#'
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Is active: {user.is_active}")
        print(f"   Is staff: {user.is_staff}")
        print(f"   Is superuser: {user.is_superuser}")
        print(f"   Email verified: {user.email_verified}")
        print(f"   Has usable password: {user.has_usable_password()}")
        
        # Check password
        if user.check_password(password):
            print("✅ Password is correct")
        else:
            print("❌ Password is incorrect")
            # Reset password
            user.set_password(password)
            user.save()
            print("✅ Password has been reset")
        
    except User.DoesNotExist:
        print(f"❌ User {email} not found")
        return
    
    # 2. Test authentication with different methods
    print("\n🔐 Testing Authentication Methods:")
    
    # Method 1: authenticate with email as username
    auth_user1 = authenticate(username=email, password=password)
    print(f"   authenticate(username='{email}', password='***'): {auth_user1}")
    
    # Method 2: authenticate with email parameter
    auth_user2 = authenticate(email=email, password=password)
    print(f"   authenticate(email='{email}', password='***'): {auth_user2}")
    
    # Method 3: Test with Django admin client
    print("\n🌐 Testing Django Admin Client:")
    client = Client()
    
    # Try to access admin
    admin_url = reverse('admin:index')
    response = client.get(admin_url)
    print(f"   GET {admin_url}: {response.status_code}")
    
    if response.status_code == 302:
        print(f"   Redirect to: {response.url}")
        
        # Try login with email as username
        login_data = {
            'username': email,  # Django admin expects 'username' field
            'password': password,
        }
        
        login_url = reverse('admin:login')
        response = client.post(login_url, login_data, follow=True)
        print(f"   POST login: {response.status_code}")
        
        if response.status_code == 200:
            # Check if we're actually logged in
            response = client.get(admin_url)
            print(f"   GET admin after login: {response.status_code}")
            
            if response.status_code == 200:
                print("   ✅ Admin login successful!")
            else:
                print("   ❌ Admin access still failed")
                print(f"   Response content: {response.content[:200]}...")
        else:
            print("   ❌ Login failed")
            print(f"   Response content: {response.content[:200]}...")
    
    # 3. Check authentication backends
    print("\n🔧 Authentication Backends:")
    from django.conf import settings
    for i, backend in enumerate(settings.AUTHENTICATION_BACKENDS):
        print(f"   {i+1}. {backend}")
    
    print("\n" + "=" * 50)
    print("✅ Debug completed!")

if __name__ == "__main__":
    debug_admin_login()