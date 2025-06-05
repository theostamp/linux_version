# backend/scripts/initial_user_setup.py
#
# Bootstraps the public schema by creating a default tenant, superuser and
# permission groups.  It also runs `migrate_schemas --shared` automatically so
# the required tables (e.g. `auth_group`) exist.

import os, sys, django
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()
from django.core.management import call_command

from tenants.models import Client, Domain
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

SUPERUSER_EMAIL = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@localhost")
SUPERUSER_PASSWORD = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin")
SUPERUSER_FIRST_NAME = os.getenv("DJANGO_SUPERUSER_FIRST_NAME", "Admin")
SUPERUSER_LAST_NAME = os.getenv("DJANGO_SUPERUSER_LAST_NAME", "User")
TENANT_DOMAIN = os.getenv("PUBLIC_DOMAIN", "localhost")

def ensure_public_tenant():
    public, _ = Client.objects.get_or_create(schema_name="public", defaults={"name": "Public"})
    Domain.objects.get_or_create(domain=TENANT_DOMAIN, tenant=public, defaults={"is_primary": True})
    print("✅ Public tenant ensured.")

def ensure_superuser():
    if not User.objects.filter(email=SUPERUSER_EMAIL).exists():
        User.objects.create_superuser(
            email=SUPERUSER_EMAIL,
            password=SUPERUSER_PASSWORD,
            first_name=SUPERUSER_FIRST_NAME,
            last_name=SUPERUSER_LAST_NAME,
        )
        print(f"✅ Superuser {SUPERUSER_EMAIL} created.")
    else:
        print(f"ℹ️ Superuser {SUPERUSER_EMAIL} already exists.")

def ensure_groups_and_permissions():
    _, _ = Group.objects.get_or_create(name="Managers")
    _, _ = Group.objects.get_or_create(name="Residents")
    print("✅ Groups ensured.")

if __name__ == "__main__":
    # Run shared migrations to ensure auth tables exist
    call_command("migrate_schemas", shared=True, interactive=False, verbosity=0)
    ensure_public_tenant()
    ensure_superuser()
    ensure_groups_and_permissions()
    print("\n✅ Public schema bootstrap complete.")
    print("You can now log in with the superuser credentials.")
    print(f"Superuser email: {SUPERUSER_EMAIL}")
    print(f"Superuser password: {SUPERUSER_PASSWORD}")
    print(f"Public tenant domain: {TENANT_DOMAIN}")
    print("Visit http://localhost:8000/admin to access the admin interface.")

          