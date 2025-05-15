import os
import django
import sys
import subprocess
from django.utils import timezone

# Προσθέτει το backend/ στο sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Ορισμός settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Client, Domain
from django.contrib.auth import get_user_model
from buildings.models import Building
from announcements.models import Announcement
from votes.models import Vote
from user_requests.models import UserRequest
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

User = get_user_model()

# -- Δεδομένα από .env ή defaults
SUPERUSER_EMAIL = os.getenv("DJANGO_SUPERUSER_EMAIL", "theostam1966@gmail.com")
SUPERUSER_PASSWORD = os.getenv("DJANGO_SUPERUSER_PASSWORD", "theo")
SUPERUSER_FIRST_NAME = os.getenv("DJANGO_SUPERUSER_FIRST_NAME", "theo")
SUPERUSER_LAST_NAME = os.getenv("DJANGO_SUPERUSER_LAST_NAME", "theo")
TENANT_DOMAIN = os.getenv("PUBLIC_DOMAIN", "localhost")
TENANT_SCHEMA = os.getenv("TENANT_SCHEMA", "public")


def ensure_public_schema_migrated():
    print("⏳ Running tenant migrations for 'public' schema...")
    subprocess.run([
        "python", "manage.py", "migrate_schemas",
        "--tenant", "--schema=public"
    ], check=True)
    print("✅ Tenant migrations completed for 'public' schema.")


def ensure_public_tenant():
    public, _ = Client.objects.get_or_create(
        schema_name="public",
        defaults={"name": "Public"},
    )
    Domain.objects.get_or_create(
        domain=TENANT_DOMAIN,
        tenant=public,
        defaults={"is_primary": True}
    )
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


def ensure_test_manager():
    email = "manager@demo.com"
    if not User.objects.filter(email=email).exists():
        user = User.objects.create_user(
            email=email,
            password="manager123",
            first_name="Demo",
            last_name="Manager",
            is_staff=True,
        )
        print("✅ Demo manager user created.")
        return user
    else:
        print("ℹ️ Demo manager user already exists.")
        return User.objects.get(email=email)


def ensure_test_resident():
    email = "resident@demo.com"
    if not User.objects.filter(email=email).exists():
        user = User.objects.create_user(
            email=email,
            password="resident123",
            first_name="Demo",
            last_name="Resident",
        )
        print("✅ Demo resident user created.")
        return user
    else:
        print("ℹ️ Demo resident user already exists.")
        return User.objects.get(email=email)


def ensure_groups_and_permissions():
    managers_group, _ = Group.objects.get_or_create(name="Managers")
    residents_group, _ = Group.objects.get_or_create(name="Residents")

    for model_name in ["building", "vote", "announcement", "userrequest"]:
        try:
            ct = ContentType.objects.get(model=model_name)
            perms = Permission.objects.filter(content_type=ct)
            managers_group.permissions.set(list(perms) + list(managers_group.permissions.all()))
        except ContentType.DoesNotExist:
            print(f"⚠️ ContentType not found for: {model_name}")

    for model_name in ["userrequest", "votesubmission"]:
        try:
            ct = ContentType.objects.get(model=model_name)
            perms = Permission.objects.filter(
                content_type=ct,
                codename__in=["add_userrequest", "view_userrequest", "add_votesubmission", "view_votesubmission"]
            )
            residents_group.permissions.set(list(perms) + list(residents_group.permissions.all()))
        except ContentType.DoesNotExist:
            print(f"⚠️ ContentType not found for: {model_name}")

    print("✅ Groups & permissions ensured.")
    return managers_group, residents_group


def ensure_default_groups():
    for name in ["Managers", "Residents"]:
        _, _ = Group.objects.get_or_create(name=name)
    print("✅ Default groups ensured.")


def ensure_sample_building():
    manager = User.objects.filter(email="manager@demo.com").first()
    if not manager:
        print("❌ Manager user not found — skipping building creation.")
        return

    building, created = Building.objects.get_or_create(
        name="Κεντρικό Κτίριο",
        defaults={
            "address": "Μεγάλου Αλεξάνδρου 36",
            "city": "Αθήνα",
            "postal_code": "10435",
            "manager": manager,
        }
    )
    print("✅ Sample building ensured.")
    return building


def ensure_sample_announcement(building):
    Announcement.objects.get_or_create(
        title="Διακοπή Ρεύματος",
        defaults={
            "description": "Θα γίνει προγραμματισμένη διακοπή ρεύματος την Παρασκευή.",
            "start_date": timezone.now().date(),
            "end_date": timezone.now().date() + timezone.timedelta(days=2),
            "building": building,
            "is_active": True,
        },
    )
    print("✅ Sample announcement ensured.")


def ensure_sample_vote(building):
    Vote.objects.get_or_create(
        title="Εγκατάσταση κάμερας εισόδου",
        defaults={
            "description": "Ψηφοφορία για την εγκατάσταση κάμερας ασφαλείας στην είσοδο.",
            "start_date": timezone.now().date(),
            "end_date": timezone.now().date() + timezone.timedelta(days=7),
            "building": building,
            "choices": ["ΝΑΙ", "ΟΧΙ", "ΛΕΥΚΟ"],
        },
    )
    print("✅ Sample vote ensured.")


def ensure_sample_request(user, building):
    UserRequest.objects.get_or_create(
        title="Επισκευή Ανελκυστήρα",
        defaults={
            "description": "Ο ανελκυστήρας σταματά συχνά μεταξύ ορόφων.",
            "status": "pending",
            "created_by": user,
            "building": building,
            "is_urgent": True,
            "type": "Τεχνικό",
        },
    )
    print("✅ Sample user request ensured.")


if __name__ == "__main__":
    ensure_public_schema_migrated()
    ensure_public_tenant()
    ensure_superuser()
    ensure_groups_and_permissions()
    ensure_default_groups()

    manager = ensure_test_manager()
    resident = ensure_test_resident()

    manager.groups.add(Group.objects.get(name="Managers"))
    resident.groups.add(Group.objects.get(name="Residents"))

    with schema_context(TENANT_SCHEMA):
        building = ensure_sample_building()
        if building:
            ensure_sample_announcement(building)
            ensure_sample_vote(building)
            ensure_sample_request(resident, building)

    print("✅ Initial user setup completed.")
    print("ℹ️ Manager: manager@demo.com / manager123")
    print("ℹ️ Resident: resident@demo.com / resident123")
    print("ℹ️ Superuser: {} / {}".format(SUPERUSER_EMAIL, SUPERUSER_PASSWORD))
    print("ℹ️ Public tenant domain: {}".format(TENANT_DOMAIN))
    print("ℹ️ Tenant schema: {}".format(TENANT_SCHEMA))  