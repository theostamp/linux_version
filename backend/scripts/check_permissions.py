#!/usr/bin/env python
"""
🔍 Script Έλεγχου Δικαιωμάτων
=============================
Ελέγχει τα δικαιώματα όλων των χρηστών στο σύστημα.
"""

import os
import sys
import django

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from tenants.models import Client

User = get_user_model()

def check_user_permissions(user):
    """Έλεγχος δικαιωμάτων ενός χρήστη"""
    permissions = {
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'is_active': user.is_active,
        'role': getattr(user, 'role', 'N/A'),
        'can_delete_users': user.is_superuser,
        'can_access_admin': user.is_staff or user.is_superuser,
        'admin_level': 'Superuser' if user.is_superuser else 'Staff' if user.is_staff else 'User'
    }
    return permissions

def print_user_info(user, schema_name="public"):
    """Εκτύπωση πληροφοριών χρήστη"""
    permissions = check_user_permissions(user)
    
    print(f"  👤 {user.email}")
    print(f"     Όνομα: {user.first_name} {user.last_name}")
    print(f"     Ρόλος: {permissions['role']}")
    print(f"     Admin Level: {permissions['admin_level']}")
    print(f"     is_superuser: {permissions['is_superuser']}")
    print(f"     is_staff: {permissions['is_staff']}")
    print(f"     is_active: {permissions['is_active']}")
    print(f"     Μπορεί να διαγράψει χρήστες: {permissions['can_delete_users']}")
    print(f"     Admin πρόσβαση: {permissions['can_access_admin']}")
    print()

def check_all_users():
    """Έλεγχος όλων των χρηστών σε όλα τα schemas"""
    print("🔍 ΕΛΕΓΧΟΣ ΔΙΚΑΙΩΜΑΤΩΝ ΧΡΗΣΤΩΝ")
    print("=" * 50)
    
    # Public schema
    print("📋 PUBLIC SCHEMA:")
    print("-" * 30)
    users = User.objects.all()
    if users.exists():
        for user in users:
            print_user_info(user, "public")
    else:
        print("  ❌ Δεν βρέθηκαν χρήστες")
    
    # Tenant schemas
    tenants = Client.objects.exclude(schema_name='public')
    for tenant in tenants:
        print(f"📋 TENANT '{tenant.schema_name.upper()}':")
        print("-" * 30)
        
        with schema_context(tenant.schema_name):
            users = User.objects.all()
            if users.exists():
                for user in users:
                    print_user_info(user, tenant.schema_name)
            else:
                print("  ❌ Δεν βρέθηκαν χρήστες")

def check_specific_user(email, tenant_schema=None):
    """Έλεγχος συγκεκριμένου χρήστη"""
    print(f"🔍 ΕΛΕΓΧΟΣ ΧΡΗΣΤΗ: {email}")
    print("=" * 40)
    
    if tenant_schema:
        with schema_context(tenant_schema):
            try:
                user = User.objects.get(email=email)
                print_user_info(user, tenant_schema)
            except User.DoesNotExist:
                print(f"❌ Ο χρήστης {email} δεν βρέθηκε στο tenant {tenant_schema}")
    else:
        try:
            user = User.objects.get(email=email)
            print_user_info(user, "public")
        except User.DoesNotExist:
            print(f"❌ Ο χρήστης {email} δεν βρέθηκε στο public schema")
            
            # Έλεγχος σε tenants
            tenants = Client.objects.exclude(schema_name='public')
            for tenant in tenants:
                with schema_context(tenant.schema_name):
                    try:
                        user = User.objects.get(email=email)
                        print(f"✅ Βρέθηκε στο tenant {tenant.schema_name}:")
                        print_user_info(user, tenant.schema_name)
                        return
                    except User.DoesNotExist:
                        continue
            
            print(f"❌ Ο χρήστης {email} δεν βρέθηκε σε κανένα schema")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="🔍 Έλεγχος Δικαιωμάτων Χρηστών")
    parser.add_argument("--email", help="Email συγκεκριμένου χρήστη")
    parser.add_argument("--tenant", help="Tenant schema για έλεγχο")
    parser.add_argument("--all", action="store_true", help="Έλεγχος όλων των χρηστών")
    
    args = parser.parse_args()
    
    if args.email:
        check_specific_user(args.email, args.tenant)
    elif args.all:
        check_all_users()
    else:
        print("❌ Χρειάζεται --email ή --all")
        print("Χρήση:")
        print("  python check_permissions.py --all")
        print("  python check_permissions.py --email admin@demo.localhost")
        print("  python check_permissions.py --email admin@demo.localhost --tenant demo")

if __name__ == "__main__":
    main()