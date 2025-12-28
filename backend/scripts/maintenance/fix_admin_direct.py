#!/usr/bin/env python3
"""
🔧 Script για διόρθωση admin user - μπορεί να τρέξει απευθείας στο Railway
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
    print('🔍 ΕΛΕΓΧΟΣ ΚΑΙ ΔΙΟΡΘΩΣΗ ADMIN USER')
    print('=' * 60 + '\n')
    
    # Έλεγχος αν υπάρχει ο χρήστης
    try:
        user = User.objects.get(email=email)
        print(f"✅ Ο χρήστης υπάρχει στη βάση")
        print(f"   Email: {user.email}")
        print(f"   First Name: {user.first_name}")
        print(f"   Last Name: {user.last_name}")
        print(f"   is_active: {user.is_active}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   email_verified: {getattr(user, 'email_verified', 'N/A')}")
        print(f"   role: {getattr(user, 'role', 'N/A')}\n")
        
        # Έλεγχος authentication
        print("🔐 Έλεγχος Authentication:")
        test_passwords = ['theo123!@#', 'admin123', 'theo123']
        authenticated = False
        working_password = None
        
        for pwd in test_passwords:
            auth_user = authenticate(username=email, password=pwd)
            if auth_user:
                authenticated = True
                working_password = pwd
                print(f"   ✅ Password '{pwd}' λειτουργεί!")
                break
            else:
                print(f"   ❌ Password '{pwd}' δεν λειτουργεί")
        
        if not authenticated:
            print("   ⚠️ Κανένα password δεν λειτουργεί!\n")
        
        # Έλεγχος flags
        print("🔑 Έλεγχος Admin Access Flags:")
        issues = []
        
        if not user.is_active:
            issues.append("❌ is_active = False")
        if not user.is_staff:
            issues.append("❌ is_staff = False")
        if not user.is_superuser:
            issues.append("❌ is_superuser = False")
        if hasattr(user, 'email_verified') and not user.email_verified:
            issues.append("⚠️ email_verified = False")
        
        if issues:
            print("   Προβλήματα που βρέθηκαν:")
            for issue in issues:
                print(f"   {issue}")
        else:
            print("   ✅ Όλα τα flags είναι σωστά!")
        
        # Διόρθωση
        if issues or not authenticated:
            print("\n" + '=' * 60)
            print("🔧 ΔΙΟΡΘΩΣΗ ADMIN USER")
            print('=' * 60 + '\n')
            
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            
            if hasattr(user, 'email_verified'):
                user.email_verified = True
            
            user.set_password(password)
            user.save()
            
            print(f"✅ Ενημερώθηκε ο χρήστης:")
            print(f"   is_active: {user.is_active}")
            print(f"   is_staff: {user.is_staff}")
            print(f"   is_superuser: {user.is_superuser}")
            print(f"   Password: {password}\n")
            
            # Επαλήθευση
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                print("✅ Authentication επιτυχής με το νέο password!")
            else:
                print("❌ Authentication απέτυχε με το νέο password!")
        
    except User.DoesNotExist:
        print(f"❌ Ο χρήστης {email} ΔΕΝ υπάρχει στη βάση!")
        print("🔧 Δημιουργία νέου superuser...\n")
        
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name='Theo',
            last_name='Stam'
        )
        
        if hasattr(user, 'email_verified'):
            user.email_verified = True
            user.save()
        
        print(f"✅ Δημιουργήθηκε νέος superuser: {email}")
    
    # Σύνοψη
    print("\n" + '=' * 60)
    print("📋 ΣΥΝΟΨΗ")
    print('=' * 60)
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Admin URL: https://linuxversion-production.up.railway.app/admin/")
    print('=' * 60 + '\n')

if __name__ == "__main__":
    main()

