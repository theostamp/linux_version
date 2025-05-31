import os
import sys
import django  # type: ignore  # type: ignore  # type: ignore
import argparse
from datetime import timedelta
from django.utils import timezone  # type: ignore  # type: ignore  # type: ignore

# ✅ Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ✅ Ορισμός settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_context  # type: ignore  # type: ignore  # type: ignore
from django.core.management import call_command  # type: ignore  # type: ignore  # type: ignore
from users.models import CustomUser
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest
from votes.models import Vote
from obligations.models import Obligation

# --- CLI input με interactive τρόπο ---
tenant_name = input("🔹 Όνομα tenant (π.χ. demo14): ").strip().lower()
manager_email = input(f"📧 Email διαχειριστή [default: {tenant_name}@demo.com]: ").strip() or f"{tenant_name}@demo.com"
manager_password = input("🔑 Κωδικός διαχειριστή (min 6 χαρακτήρες): ").strip()
resident_email = f"resident@{tenant_name}.com"
resident_password = "123456"
domain_url = f"{tenant_name}.localhost"

# --- Μοντέλα ---
TenantModel = get_tenant_model()
DomainModel = get_tenant_domain_model()

# --- Δημιουργία Tenant ---
tenant = TenantModel(
    schema_name=tenant_name,
    name=f"{tenant_name.title()} Office",
    paid_until=timezone.now() + timedelta(days=365),
    on_trial=True,
)
tenant.save()

# --- Domain ---
domain = DomainModel()
domain.domain = domain_url
domain.tenant = tenant
domain.is_primary = True
domain.save()

# --- Migrations για schema ---
call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False)

# --- Demo Δεδομένα ---
with schema_context(tenant.schema_name):
    manager = CustomUser.objects.create_user(
        email=manager_email,
        password=manager_password,
        first_name="Demo",
        last_name="Manager",
        is_active=True,
        is_staff=True,
        is_superuser=False,
    )

    building = Building.objects.create(
        name="Demo Κτίριο",
        address="Οδός Demo 1",
        city="Αθήνα",
        postal_code="11111",
        apartments_count=10,
        internal_manager_name="Γραμματεία",
        manager=manager,
    )

    resident = CustomUser.objects.create_user(
        email=resident_email,
        password=resident_password,
        first_name="Demo",
        last_name="Resident",
        is_active=True,
        is_staff=False,
        is_superuser=False,
    )
    BuildingMembership.objects.create(building=building, resident=resident, role="resident")

    Announcement.objects.create(
        title="Καλωσορίσατε!",
        content="Αυτή είναι μια δοκιμαστική ανακοίνωση για το νέο σας demo κτίριο.",
        building=building,
        author=manager,
    )

    UserRequest.objects.create(
        title="Βλάβη στον φωτισμό",
        description="Η λάμπα στην είσοδο είναι καμένη.",
        building=building,
        created_by=resident,
    )

    Vote.objects.create(
        title="Αλλαγή διαχειριστή",
        description="Ψηφίστε αν συμφωνείτε να αλλάξει ο διαχειριστής.",
        building=building,
        created_by=manager,
        expires_at=timezone.now() + timedelta(days=5),
    )

    Obligation.objects.create(
        building=building,
        title="Ανταλλακτικά θυροτηλεφώνου",
        amount=150.0,
        due_date=timezone.now() + timedelta(days=30),
        created_by=manager,
    )

# --- Καταγραφή credentials ---
log_dir = os.path.join("backend", "logs")
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, f"{tenant_name}.log")

with open(log_path, "w") as f:
    f.write(f"TENANT: {tenant_name}\n")
    f.write(f"DOMAIN: http://{domain_url}:3000\n")
    f.write("\n--- Manager ---\n")
    f.write(f"Email: {manager_email}\nPassword: {manager_password}\n")
    f.write("\n--- Resident ---\n")
    f.write(f"Email: {resident_email}\nPassword: {resident_password}\n")

print(f"\n✅ Ολοκληρώθηκε η δημιουργία tenant '{tenant_name}' με demo δεδομένα.")
print(f"📄 Αρχείο credentials: {log_path}")
print(f"🌐 Πρόσβαση στο frontend μέσω: http://{domain_url}:3000")
