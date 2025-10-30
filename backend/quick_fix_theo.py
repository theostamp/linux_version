#!/usr/bin/env python
"""
QUICK FIX for theo etherm2021@gmail.com
Sets role to 'manager' with is_superuser=False
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from django.contrib.auth.models import Group

# Fix theo
user = CustomUser.objects.get(email='etherm2021@gmail.com')

print(f"\n{'='*60}")
print(f"BEFORE:")
print(f"  role: {user.role}")
print(f"  is_superuser: {user.is_superuser}")
print(f"  is_staff: {user.is_staff}")

# Set as Manager (NOT superuser)
user.role = 'manager'
user.is_superuser = False  # ← Regular Manager
user.is_staff = True
user.save()

# Add to Manager group
manager_group, _ = Group.objects.get_or_create(name='Manager')
user.groups.add(manager_group)

# Remove from Resident group
if user.groups.filter(name='Resident').exists():
    user.groups.remove(Group.objects.get(name='Resident'))

user.refresh_from_db()

print(f"\nAFTER:")
print(f"  role: {user.role}")
print(f"  is_superuser: {user.is_superuser}")
print(f"  is_staff: {user.is_staff}")
print(f"  groups: {[g.name for g in user.groups.all()]}")
print(f"{'='*60}")
print(f"✅ theo is now Manager (NOT superuser)")
print(f"   User must LOGOUT and LOGIN again!")
print(f"{'='*60}\n")

