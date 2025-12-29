#!/usr/bin/env python
"""
Script για να κάνεις έναν χρήστη Ultra Admin (πρόσβαση στο Network Usage Panel)
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context, get_public_schema_name

User = get_user_model()

def make_user_admin(email: str):
    """Κάνει έναν χρήστη Ultra Admin"""
    with schema_context(get_public_schema_name()):
        try:
            user = User.objects.get(email=email)

            # Set admin role and permissions
            user.role = User.SystemRole.ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.email_verified = True
            user.save()

            print(f"✅ Ο χρήστης {email} είναι τώρα Ultra Admin!")
            print(f"   - role: {user.role}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_superuser: {user.is_superuser}")
            print(f"\n🌐 Μπορείς να συνδεθείς και να δεις το Network Usage Panel στο:")
            print(f"   /admin/network-usage")

        except User.DoesNotExist:
            print(f"❌ Ο χρήστης {email} δεν βρέθηκε!")
            print(f"   Δημιούργησε πρώτα τον χρήστη ή χρησιμοποίησε:")
            print(f"   python backend/scripts/create_superuser.py --email {email} --password yourpassword")
            return False

    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Χρήση: python make_user_admin.py <email>")
        print("Παράδειγμα: python make_user_admin.py admin@example.com")
        sys.exit(1)

    email = sys.argv[1]
    make_user_admin(email)

