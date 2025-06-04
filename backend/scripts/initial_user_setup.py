# backend/scripts/initial_user_setup.py

import os, sys, django
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

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
    ensure_public_tenant()
    ensure_superuser()
    ensure_groups_and_permissions()
    print("\n✅ Public schema bootstrap complete.")
