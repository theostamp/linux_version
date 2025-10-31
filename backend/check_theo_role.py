#!/usr/bin/env python
"""
Quick check of theo user's current role and permissions
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser

def check_theo():
    email = 'etherm2021@gmail.com'
    
    try:
        user = CustomUser.objects.get(email=email)
        
        print(f"\n{'='*60}")
        print(f"USER: {user.email}")
        print(f"{'='*60}")
        print(f"  ID: {user.id}")
        print(f"  Role: {user.role}")
        print(f"  is_staff: {user.is_staff}")
        print(f"  is_superuser: {user.is_superuser}")
        print(f"  is_active: {user.is_active}")
        print(f"  Groups: {[g.name for g in user.groups.all()]}")
        print(f"{'='*60}\n")
        
        # Check what would be in JWT token
        print(f"JWT TOKEN PAYLOAD WOULD CONTAIN:")
        print(f"  - role: '{user.role}'")
        print(f"  - is_staff: {user.is_staff}")
        print(f"  - is_superuser: {user.is_superuser}")
        print(f"{'='*60}\n")
        
        if user.role == 'manager' and user.is_staff:
            print("✅ User has correct permissions in DATABASE")
            print("❌ BUT frontend still shows old cached token!")
            print("\n🔧 SOLUTION: User must LOGOUT and LOGIN again\n")
        else:
            print("❌ User does NOT have correct permissions")
            print("   Run: python fix_theo_user.py\n")
            
    except CustomUser.DoesNotExist:
        print(f"❌ User {email} not found!\n")

if __name__ == '__main__':
    check_theo()





