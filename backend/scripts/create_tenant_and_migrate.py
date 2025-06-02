# backend/scripts/create_tenant_and_migrate.py

import os
import sys
import django
import argparse
from getpass import getpass
from datetime import timedelta
from django.utils import timezone

# ✅ Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_context, schema_exists
from django.core.management import call_command
from users.models import CustomUser
from buildings.models import Building, BuildingMembership
from announcements.models import Announcement
from user_requests.models import UserRequest
from votes.models import Vote
from obligations.models import Obligation

# --- CLI Arguments ---
parser = argparse.ArgumentParser(description="Δημιουργία tenant/demo δεδομένων (django-tenants)")
parser.add_argument("name", help="Όνομα tenant (schema/db/user/email/domain)")
parser.add_argument("-p", "--password", help="Password διαχειριστή (min 6 χαρακτήρες)", required=False)
parser.add_argument("--manager-email", help="Email διαχειριστή", required=False)
parser.add_argument("--resident-password", help="Password κατοίκου", required=False)
parser.add_argument("--resident-email", help="Email κατοίκου", required=False)
args = parser.parse_args()

tenant_name = args.name.strip().lower()

# --- Schema Existence Check ---
TenantModel = get_tenant_model()
DomainModel = get_tenant_domain_model()

if schema_exists(tenant_name):
    print(f"❌ Το schema '{tenant_name}' υπάρχει ήδη! Διέγραψέ το πρώτα αν θες να το ξαναδημιουργήσεις.")
    sys.exit(1)

manager_email = args.manager_email or f"manager@{tenant_name}.com"
resident_email = args.resident_email or f"resident@{tenant_name}.com"

# Ασφαλής είσοδος password (αν δεν δόθηκε με flag)
if args.password:
    manager_password = args.password
else:
    while True:
        manager_password = getpass("🔑 Password διαχειριστή (min 6 χαρακτήρες): ")
        if len(manager_password) < 6:
            print("❌ Τουλάχιστον 6 χαρακτήρες.")
        else:
            break

resident_password = args.resident_password or "123456"
domain_url = f"{tenant_name}.localhost"

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
        role="manager",
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
        description="Αυτή είναι μια δοκιμαστική ανακοίνωση για το νέο σας demo κτίριο.",
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
        creator=manager,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )

    Obligation.objects.create(
        building=building,
        title="Ανταλλακτικά θυροτηλεφώνου",
        amount=150.0,
        due_date=timezone.now() + timedelta(days=30),
        # created_by=manager,
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
