#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context, get_public_schema_name
from users.models import CustomUser

def fix_etherm_user():
    """
    Διόρθωση του etherm2021@gmail.com να μην είναι superuser
    """
    with schema_context(get_public_schema_name()):
        try:
            user = CustomUser.objects.get(email='etherm2021@gmail.com')
            
            print(f"\n🔍 Checking user: {user.email}")
            print(f"  Before:")
            print(f"    role: {user.role}")
            print(f"    is_staff: {user.is_staff}")
            print(f"    is_superuser: {user.is_superuser}")
            
            if user.is_superuser:
                user.is_superuser = False
                user.is_staff = True
                user.role = 'manager'
                user.save(update_fields=['is_superuser', 'is_staff', 'role'])
                
                print(f"\n  ✅ Fixed!")
                print(f"    role: {user.role}")
                print(f"    is_staff: {user.is_staff}")
                print(f"    is_superuser: {user.is_superuser}")
            else:
                print(f"\n  ✅ Already correct!")
                
        except CustomUser.DoesNotExist:
            print(f"\n❌ User etherm2021@gmail.com not found")

if __name__ == '__main__':
    fix_etherm_user()
