#!/usr/bin/env python
"""
🔧 Script Δημιουργίας Superuser
===============================
Δημιουργεί έναν πραγματικό superuser με πλήρη δικαιώματα admin.
"""

import os
import sys
import django
import argparse

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

User = get_user_model()

def create_superuser(email, password, first_name="Admin", last_name="User"):
    """Δημιουργία superuser με πλήρη δικαιώματα"""
    
    print(f"🔧 Δημιουργία superuser: {email}")
    
    # Έλεγχος αν υπάρχει ήδη
    if User.objects.filter(email=email).exists():
        user = User.objects.get(email=email)
        print(f"ℹ️ Ο χρήστης {email} υπάρχει ήδη")
        
        # Ενημέρωση δικαιωμάτων
        user.is_superuser = True
        user.is_staff = True
        user.is_active = True
        user.set_password(password)
        user.save()
        print(f"✅ Ενημερώθηκαν τα δικαιώματα για {email}")
        return user
    else:
        # Δημιουργία νέου superuser
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        print(f"✅ Δημιουργήθηκε νέος superuser: {email}")
        return user

def create_tenant_superuser(tenant_schema, email, password, first_name="Admin", last_name="User"):
    """Δημιουργία superuser σε συγκεκριμένο tenant"""
    
    print(f"🔧 Δημιουργία superuser στο tenant {tenant_schema}: {email}")
    
    with schema_context(tenant_schema):
        # Έλεγχος αν υπάρχει ήδη
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            print(f"ℹ️ Ο χρήστης {email} υπάρχει ήδη στο tenant {tenant_schema}")
            
            # Ενημέρωση δικαιωμάτων
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.set_password(password)
            user.save()
            print(f"✅ Ενημερώθηκαν τα δικαιώματα για {email} στο tenant {tenant_schema}")
            return user
        else:
            # Δημιουργία νέου superuser
            user = User.objects.create_superuser(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            print(f"✅ Δημιουργήθηκε νέος superuser: {email} στο tenant {tenant_schema}")
            return user

def list_superusers():
    """Εμφάνιση όλων των superusers"""
    print("🔍 Λίστα superusers:")
    print("=" * 50)
    
    # Public schema superusers
    superusers = User.objects.filter(is_superuser=True)
    if superusers.exists():
        print("📋 Public Schema Superusers:")
        for user in superusers:
            print(f"  - {user.email} ({user.first_name} {user.last_name})")
            print(f"    is_staff: {user.is_staff}, is_active: {user.is_active}")
    else:
        print("❌ Δεν βρέθηκαν superusers στο public schema")
    
    # Tenant superusers
    from tenants.models import Client
    tenants = Client.objects.exclude(schema_name='public')
    
    for tenant in tenants:
        with schema_context(tenant.schema_name):
            tenant_superusers = User.objects.filter(is_superuser=True)
            if tenant_superusers.exists():
                print(f"\n📋 Tenant '{tenant.schema_name}' Superusers:")
                for user in tenant_superusers:
                    print(f"  - {user.email} ({user.first_name} {user.last_name})")
                    print(f"    is_staff: {user.is_staff}, is_active: {user.is_active}")

def main():
    parser = argparse.ArgumentParser(description="🔧 Δημιουργία Superuser")
    parser.add_argument("--email", help="Email του superuser")
    parser.add_argument("--password", help="Password του superuser")
    parser.add_argument("--first-name", default="Admin", help="Όνομα")
    parser.add_argument("--last-name", default="User", help="Επώνυμο")
    parser.add_argument("--tenant", help="Tenant schema (αν δεν δοθεί, δημιουργείται στο public)")
    parser.add_argument("--list", action="store_true", help="Εμφάνιση όλων των superusers")
    
    args = parser.parse_args()
    
    if args.list:
        list_superusers()
        return
    
    if not args.email or not args.password:
        print("❌ Χρειάζονται email και password")
        print("Χρήση: python create_superuser.py --email admin@example.com --password mypassword")
        return
    
    if args.tenant:
        create_tenant_superuser(
            args.tenant, 
            args.email, 
            args.password, 
            args.first_name, 
            args.last_name
        )
    else:
        create_superuser(
            args.email, 
            args.password, 
            args.first_name, 
            args.last_name
        )
    
    print("\n✅ Superuser δημιουργήθηκε επιτυχώς!")
    print(f"👤 Email: {args.email}")
    print(f"🔑 Password: {args.password}")
    if args.tenant:
        print(f"🏢 Tenant: {args.tenant}")
        print(f"🌐 Admin URL: http://{args.tenant}.localhost:8000/admin/")
    else:
        print("🌐 Admin URL: http://localhost:8000/admin/")

if __name__ == "__main__":
    main()