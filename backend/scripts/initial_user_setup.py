import os
import sys
import subprocess
import django  # type: ignore
from django.utils import timezone # type: ignore

# --------------------------------------------------
# Django bootstrap
# --------------------------------------------------
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

# --------------------------------------------------
# Imports AFTER django.setup()
# --------------------------------------------------
from django_tenants.utils import schema_context  # type: ignore
from tenants.models import Client, Domain
from django.contrib.auth import get_user_model # type: ignore
from django.contrib.auth.models import Group, Permission # type: ignore
from django.contrib.contenttypes.models import ContentType # type: ignore
from buildings.models import Building
from announcements.models import Announcement
from votes.models import Vote
from user_requests.models import UserRequest

User = get_user_model()

# --------------------------------------------------
# ENV defaults
# --------------------------------------------------
SUPERUSER_EMAIL = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@localhost")
SUPERUSER_PASSWORD = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin")
SUPERUSER_FIRST_NAME = os.getenv("DJANGO_SUPERUSER_FIRST_NAME", "Admin")
SUPERUSER_LAST_NAME = os.getenv("DJANGO_SUPERUSER_LAST_NAME", "User")
TENANT_DOMAIN = os.getenv("PUBLIC_DOMAIN", "localhost")
TENANT_SCHEMA = os.getenv("TENANT_SCHEMA", "public")

# --------------------------------------------------
# Helpers
# --------------------------------------------------

def run_migrations(schema: str):
    print(f"\n⏳ Running migrations for schema '{schema}' ...")
    subprocess.run(["python", "manage.py", "migrate_schemas", "--tenant", "--schema", schema], check=True)
    print("✅ Migrations finished.")

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
    managers, _ = Group.objects.get_or_create(name="Managers")
    residents, _ = Group.objects.get_or_create(name="Residents")

    for model_name in ["building", "vote", "announcement", "userrequest"]:
        try:
            ct = ContentType.objects.get(model=model_name)
            perms = Permission.objects.filter(content_type=ct)
            managers.permissions.add(*perms)
        except ContentType.DoesNotExist:
            pass

    for model_name in ["userrequest", "votesubmission"]:
        try:
            ct = ContentType.objects.get(model=model_name)
            perms = Permission.objects.filter(content_type=ct, codename__in=[
                "add_userrequest", "view_userrequest", "add_votesubmission", "view_votesubmission"])
            residents.permissions.add(*perms)
        except ContentType.DoesNotExist:
            pass
    print("✅ Groups & permissions ensured.")

def ensure_demo_users():
    def create(email, pwd, first, last, is_staff=False):
        if User.objects.filter(email=email).exists():
            print(f"ℹ️ Demo user {email} exists.")
            return User.objects.get(email=email)
        user = User.objects.create_user(email=email, password=pwd, first_name=first, last_name=last, is_staff=is_staff)
        print(f"✅ Demo user {email} created.")
        return user

    manager1 = create("manager1@demo.com", "manager123", "Manager", "One", True)
    manager2 = create("manager2@demo.com", "manager123", "Manager", "Two", True)
    tenant1 = create("tenant1@demo.com", "tenant123", "Tenant", "One", False)
    tenant2 = create("tenant2@demo.com", "tenant123", "Tenant", "Two", False)

    managers_group = Group.objects.get(name="Managers")
    residents_group = Group.objects.get(name="Residents")
    for mgr in [manager1, manager2]:
        mgr.groups.add(managers_group)
    for res in [tenant1, tenant2]:
        res.groups.add(residents_group)

    return manager1, manager2, tenant1, tenant2

# --------------------------------------------------
# Tenant‑scoped demo data
# --------------------------------------------------

def seed_demo_data(manager1, manager2, tenant1, tenant2):
    buildings = [
        {"name": "Κτίριο 1.1", "manager": manager1, "tenant": tenant1, "address": "Οδός 1", "city": "Αθήνα", "postal_code": "11111"},
        {"name": "Κτίριο 1.2", "manager": manager1, "tenant": tenant2, "address": "Οδός 2", "city": "Αθήνα", "postal_code": "11112"},
        {"name": "Κτίριο 2.1", "manager": manager2, "tenant": tenant1, "address": "Οδός 3", "city": "Πειραιάς", "postal_code": "18531"},
        {"name": "Κτίριο 2.2", "manager": manager2, "tenant": tenant2, "address": "Οδός 4", "city": "Πειραιάς", "postal_code": "18532"},
    ]

    for b in buildings:
        building, _ = Building.objects.get_or_create(
            name=b["name"],
            defaults={
                "manager": b["manager"],
                "address": b["address"],
                "city": b["city"],
                "postal_code": b["postal_code"]
            },
        )

        Announcement.objects.get_or_create(
            title=f"Ανακοίνωση για {b['name']}",
            defaults={
                "description": "Γενική ενημέρωση.",
                "start_date": timezone.now().date(),
                "end_date": timezone.now().date() + timezone.timedelta(days=2),
                "building": building,
            },
        )

        Vote.objects.get_or_create(
            title=f"Ψηφοφορία για {b['name']}",
            defaults={
                "description": "Ετήσια συνέλευση.",
                "start_date": timezone.now().date(),
                "end_date": timezone.now().date() + timezone.timedelta(days=7),
                "building": building,
            },
        )

        UserRequest.objects.get_or_create(
            title=f"Αίτημα για {b['name']}",
            defaults={
                "description": "Γενικό αίτημα.",
                "status": "pending",
                "created_by": b["tenant"],
                "building": building,
                "type": "Τεχνικό",
            },
        )

    print("✅ Multiple buildings and data seeded.")

# --------------------------------------------------
# Main execution
# --------------------------------------------------
if __name__ == "__main__":
    run_migrations(TENANT_SCHEMA)
    ensure_public_tenant()
    ensure_superuser()
    ensure_groups_and_permissions()
    manager1, manager2, tenant1, tenant2 = ensure_demo_users()
    with schema_context(TENANT_SCHEMA):
        seed_demo_data(manager1, manager2, tenant1, tenant2)
    print("\n✅ Demo dataset complete for schema:", TENANT_SCHEMA)