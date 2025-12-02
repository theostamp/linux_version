#!/usr/bin/env python3
"""
Debug script to check user status in the database.
Run with: railway run python debug_user_login.py <email>
"""
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")

import django
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_user(email_to_check):
    """Check if the user exists and verify their status"""
    print(f"🔍 Checking user {email_to_check} in database...")

    try:
        user = User.objects.get(email=email_to_check)
        print(f"✅ User found: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   First name: {user.first_name}")
        print(f"   Last name: {user.last_name}")
        print(f"   Role: {user.role}")
        print(f"   is_active: {user.is_active}")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}")
        print(f"   email_verified: {user.email_verified}")
        print(f"   tenant_id: {user.tenant_id}")
        print(f"   date_joined: {user.date_joined}")
        print(f"   last_login: {user.last_login}")

    except User.DoesNotExist:
        print(f"❌ User {email_to_check} not found in database")


def list_all_residents():
    """List all users with role='resident'"""
    print("\n=== ALL RESIDENTS ===")
    residents = User.objects.filter(role='resident')
    for u in residents:
        print(f"\nEmail: {u.email}")
        print(f"  ID: {u.id}")
        print(f"  is_active: {u.is_active}")
        print(f"  is_staff: {u.is_staff}")
        print(f"  is_superuser: {u.is_superuser}")
        print(f"  email_verified: {u.email_verified}")
        print(f"  tenant_id: {u.tenant_id}")


if __name__ == "__main__":
    if len(sys.argv) == 2:
        check_user(sys.argv[1])
    else:
        list_all_residents()

