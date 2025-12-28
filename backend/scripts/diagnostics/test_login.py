#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django.test import Client
from django.urls import reverse

User = get_user_model()

def test_login():
    """Δοκιμάζει το login στο Django admin"""
    
    print("🔍 Testing Django Admin Login")
    print("=" * 40)
    
    # 1. Έλεγχος αν υπάρχει superuser
    superusers = User.objects.filter(is_superuser=True)
    print(f"Superusers found: {superusers.count()}")
    for user in superusers:
        print(f"  - {user.email} (active: {user.is_active}, staff: {user.is_staff})")
    
    # 2. Έλεγχος authentication
    print("\n🔐 Testing Authentication:")
    user = authenticate(username='theostam1966@gmail.com', password='admin123')
    if user:
        print(f"  ✅ Authentication successful: {user.email}")
        print(f"     Is active: {user.is_active}")
        print(f"     Is staff: {user.is_staff}")
        print(f"     Is superuser: {user.is_superuser}")
    else:
        print("  ❌ Authentication failed")
        return
    
    # 3. Έλεγχος Django admin access
    print("\n🌐 Testing Django Admin Access:")
    client = Client()
    
    # Δοκιμάζουμε να προσπελάσουμε το admin
    admin_url = reverse('admin:index')
    print(f"  Admin URL: {admin_url}")
    
    response = client.get(admin_url)
    print(f"  GET admin response: {response.status_code}")
    
    if response.status_code == 302:
        print(f"  Redirect location: {response.url}")
        
        # Δοκιμάζουμε το login
        login_url = reverse('admin:login')
        print(f"  Login URL: {login_url}")
        
        # Δοκιμάζουμε να συνδεθούμε
        login_data = {
            'username': 'theostam1966@gmail.com',
            'password': 'admin123',
        }
        
        response = client.post(login_url, login_data, follow=True)
        print(f"  POST login response: {response.status_code}")
        
        if response.status_code == 200:
            print("  ✅ Login successful!")
            
            # Δοκιμάζουμε ξανά το admin
            response = client.get(admin_url)
            print(f"  GET admin after login: {response.status_code}")
            
            if response.status_code == 200:
                print("  ✅ Admin access successful!")
            else:
                print("  ❌ Admin access failed")
        else:
            print("  ❌ Login failed")
            print(f"  Response content: {response.content[:200]}...")
    else:
        print("  ❌ Unexpected response from admin")
    
    print("\n" + "=" * 40)
    print("✅ Login test completed!")

if __name__ == "__main__":
    test_login() 