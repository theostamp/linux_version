import os
import sys
import subprocess
import django # type: ignore
from django.utils import timezone

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
from django_tenants.utils import schema_context # type: ignore
from tenants.models import Client, Domain
from django.contrib.auth import get_user_model # type: ignore
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
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
    """Run tenant migrations for a given schema (shared+tenant)."""
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

    mgr = create("manager@demo.com", "manager123", "Demo", "Manager", True)
    res = create("resident@demo.com", "resident123", "Demo", "Resident", False)
    mgr.groups.add(Group.objects.get(name="Managers"))
    res.groups.add(Group.objects.get(name="Residents"))
    return mgr, res

# --------------------------------------------------
# Tenant‑scoped demo data
# --------------------------------------------------

def seed_demo_data(manager, resident):
    """Populate sample building/announcement/vote/request in current schema."""
    building, _ = Building.objects.get_or_create(
        name="Κεντρικό Κτίριο",
        defaults={
            "address": "Μεγάλου Αλεξάνδρου 36",
            "city": "Αθήνα",
            "postal_code": "10435",
            "manager": manager,
        },
    )
    print("✅ Sample building ensured.")

    Announcement.objects.get_or_create(
        title="Διακοπή Ρεύματος",
        defaults={
            "description": "Θα γίνει προγραμματισμένη διακοπή ρεύματος την Παρασκευή.",
            "start_date": timezone.now().date(),
            "end_date": timezone.now().date() + timezone.timedelta(days=2),
            "building": building,
            # "is_active": True,
        },
    )
    print("✅ Sample announcement ensured.")

    Vote.objects.get_or_create(
        title="Εγκατάσταση κάμερας εισόδου",
        defaults={
            "description": "Ψηφοφορία για εγκατάσταση κάμερας ασφαλείας στην είσοδο.",
            "start_date": timezone.now().date(),
            "end_date": timezone.now().date() + timezone.timedelta(days=7),
            "building": building,
            # "choices": ["ΝΑΙ", "ΟΧΙ", "ΛΕΥΚΟ"],
        },
    )
    print("✅ Sample vote ensured.")

    UserRequest.objects.get_or_create(
        title="Επισκευή Ανελκυστήρα",
        defaults={
            "description": "Ο ανελκυστήρας σταματά συχνά μεταξύ ορόφων.",
            "status": "pending",
            "created_by": resident,
            "building": building,
            # "is_urgent": True,
            "type": "Τεχνικό",
        },
    )
    print("✅ Sample user request ensured.")

# --------------------------------------------------
# Main execution
# --------------------------------------------------
if __name__ == "__main__":
    # 1) Run migrations for the public schema (tenant apps too)
    run_migrations(TENANT_SCHEMA)

    # 2) Shared setup (runs in default connection -> public)
    ensure_public_tenant()
    ensure_superuser()
    ensure_groups_and_permissions()
    managers, residents = ensure_demo_users()

    # 3) Seed demo data INSIDE the appropriate schema (public == main building)
    with schema_context(TENANT_SCHEMA):
        seed_demo_data(managers, residents)

    print("\n✅ Initial user setup completed for schema:", TENANT_SCHEMA)
    print("ℹ️  Manager  → manager@demo.com / manager123")
    print("ℹ️  Resident → resident@demo.com / resident123")
    print("ℹ️  Superuser→", SUPERUSER_EMAIL, "/", SUPERUSER_PASSWORD)
