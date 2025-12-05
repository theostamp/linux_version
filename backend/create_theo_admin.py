#!/usr/bin/env python3
"""
🔧 Script για δημιουργία/διόρθωση admin user: theostam1966@gmail.com
"""

import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

def main():
    email = 'theostam1966@gmail.com'
    password = 'theo123!@#'
    
    print('\n' + '=' * 60)
    print('🔧 ΔΗΜΙΟΥΡΓΙΑ/ΔΙΟΡΘΩΣΗ ADMIN USER')
    print('=' * 60 + '\n')
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ Ο χρήστης υπάρχει: {email}")
        print(f"   is_active: {user.is_active}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}\n")
        
        # Διόρθωση flags
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        if hasattr(user, 'email_verified'):
            user.email_verified = True
        
        user.set_password(password)
        user.save()
        
        print("✅ Ενημερώθηκε ο χρήστης:")
        print(f"   is_active: {user.is_active}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   Password: {password}\n")
        
    except User.DoesNotExist:
        print(f"❌ Ο χρήστης δεν υπάρχει. Δημιουργία...\n")
        
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='Theo',
            last_name='Stam'
        )
        
        if hasattr(user, 'email_verified'):
            user.email_verified = True
            user.save()
        
        print(f"✅ Δημιουργήθηκε superuser: {email}")
    
    # Επαλήθευση
    auth_user = authenticate(username=email, password=password)
    if auth_user:
        print("✅ Authentication επιτυχής!")
    else:
        print("❌ Authentication απέτυχε!")
    
    print("\n" + '=' * 60)
    print("📋 ΣΥΝΟΨΗ")
    print('=' * 60)
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Admin URL: https://linuxversion-production.up.railway.app/admin/")
    print('=' * 60 + '\n')

if __name__ == "__main__":
    main()

