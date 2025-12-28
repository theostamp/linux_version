#!/usr/bin/env python3
"""
🔍 Script Ελέγχου και Διόρθωσης Admin User
==========================================
Ελέγχει και διορθώνει τον admin user για πρόσβαση στο Django Admin.
"""

import os
import sys
import django

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django_tenants.utils import schema_context

User = get_user_model()

def check_user(email):
    """Έλεγχος χρήστη"""
    print(f"\n🔍 Έλεγχος χρήστη: {email}")
    print("=" * 60)
    
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
        print(f"   role: {getattr(user, 'role', 'N/A')}")
        
        # Έλεγχος authentication
        print(f"\n🔐 Έλεγχος Authentication:")
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
            print(f"   ⚠️ Κανένα password δεν λειτουργεί!")
        
        # Έλεγχος flags για admin access
        print(f"\n🔑 Έλεγχος Admin Access Flags:")
        issues = []
        
        if not user.is_active:
            issues.append("❌ is_active = False (ο χρήστης είναι ανενεργός)")
        
        if not user.is_staff:
            issues.append("❌ is_staff = False (ο χρήστης δεν έχει πρόσβαση στο admin)")
        
        if not user.is_superuser:
            issues.append("❌ is_superuser = False (ο χρήστης δεν είναι superuser)")
        
        if hasattr(user, 'email_verified') and not user.email_verified:
            issues.append("⚠️ email_verified = False (μπορεί να προκαλέσει προβλήματα)")
        
        if issues:
            print("   Προβλήματα που βρέθηκαν:")
            for issue in issues:
                print(f"   {issue}")
        else:
            print("   ✅ Όλα τα flags είναι σωστά!")
        
        return user, authenticated, working_password, issues
        
    except User.DoesNotExist:
        print(f"❌ Ο χρήστης {email} ΔΕΝ υπάρχει στη βάση!")
        return None, False, None, ["User does not exist"]

def fix_user(email, password='theo123!@#'):
    """Διόρθωση χρήστη"""
    print(f"\n🔧 Διόρθωση χρήστη: {email}")
    print("=" * 60)
    
    try:
        user = User.objects.get(email=email)
        
        # Ενημέρωση flags
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        
        if hasattr(user, 'email_verified'):
            user.email_verified = True
        
        # Ενημέρωση password
        user.set_password(password)
        
        # Αποθήκευση
        user.save()
        
        print(f"✅ Ενημερώθηκε ο χρήστης:")
        print(f"   is_active: {user.is_active}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   Password: {password}")
        
        # Επαλήθευση authentication
        auth_user = authenticate(username=email, password=password)
        if auth_user:
            print(f"✅ Authentication επιτυχής με το νέο password!")
        else:
            print(f"❌ Authentication απέτυχε με το νέο password!")
        
        return user
        
    except User.DoesNotExist:
        print(f"❌ Ο χρήστης {email} δεν υπάρχει!")
        print(f"🔧 Δημιουργία νέου superuser...")
        
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
        return user

def main():
    email = 'theostam1966@gmail.com'
    
    print("=" * 60)
    print("🔍 ΕΛΕΓΧΟΣ ΚΑΙ ΔΙΟΡΘΩΣΗ ADMIN USER")
    print("=" * 60)
    
    # Έλεγχος
    user, authenticated, working_password, issues = check_user(email)
    
    # Αν υπάρχουν προβλήματα, διόρθωση
    if issues or not authenticated:
        print(f"\n⚠️ Βρέθηκαν προβλήματα. Προχωράμε σε διόρθωση...")
        
        # Χρήση του working password αν υπάρχει, αλλιώς default
        password = working_password if working_password else 'theo123!@#'
        
        fix_user(email, password)
        
        # Επαναληπτικός έλεγχος
        print(f"\n🔄 Επαναληπτικός έλεγχος...")
        check_user(email)
    else:
        print(f"\n✅ Ο χρήστης είναι έτοιμος για πρόσβαση στο Django Admin!")
        if working_password:
            print(f"   Password: {working_password}")
    
    print(f"\n" + "=" * 60)
    print("📋 ΣΥΝΟΨΗ")
    print("=" * 60)
    print(f"Email: {email}")
    print(f"Admin URL: https://linuxversion-production.up.railway.app/admin/")
    print(f"Password: {working_password if working_password else 'theo123!@#'}")
    print("=" * 60)

if __name__ == "__main__":
    main()

