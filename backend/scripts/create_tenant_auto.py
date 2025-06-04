#!/usr/bin/env python3
"""
Automated tenant bootstrap script
--------------------------------
Creates **Client**, **Schema** and **Domain** in one go, using **one and the same slug**
for all artefacts (schema, domain & default manager credentials).

Example (development – default ROOT_DOMAIN = "localhost"):
----------------------------------------------------------
$ docker compose exec backend \
    python backend/scripts/create_tenant_auto.py neo \
           --manager-password "secret123"

It will create:
* schema   : ``neo``
* domain   : ``neo.localhost``
* manager  : ``manager@neo.localhost``  (unless you pass --manager-email)

By default it also runs tenant‑specific migrations and writes the credentials
under **backend/logs/neo.log**.

For production you can export a different ROOT_DOMAIN, e.g. ``export ROOT_DOMAIN=myapp.com``.

Re‑running the script with the *same* slug is **idempotent** – it will skip
anything that already exists.
"""

import argparse
import os
import sys
from datetime import timedelta

import django 
from django.core.management import call_command 
from django.utils import timezone 

# --- Django bootstrap -------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BACKEND_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")

django.setup()

from django_tenants.utils import ( 
    get_tenant_model,
    get_tenant_domain_model,
    schema_context,
)

from users.models import CustomUser
from buildings.models import Building, BuildingMembership

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def echo(msg: str):
    print(f"\033[92m✔︎\033[0m {msg}")


def already(msg: str):
    print(f"\033[93m↺\033[0m {msg}")


def err(msg: str):
    print(f"\033[91m✘ {msg}\033[0m")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parser = argparse.ArgumentParser(description="Create a new tenant (schema + domain + admin user)")
parser.add_argument("slug", help="Tenant slug to be used for schema & sub‑domain (only lowercase, no spaces)")
parser.add_argument("--manager-email", dest="manager_email", default=None, help="Override manager e‑mail address")
parser.add_argument("--manager-password", dest="manager_password", default="changeme123", help="Password for the manager user")
parser.add_argument("--no-demo", action="store_true", help="Skip demo data (only create empty schema)")
args = parser.parse_args()

slug: str = args.slug.lower().strip()
if not slug.isidentifier():
    err("Slug must be letters/numbers/underscore and may not start with a digit.")

# Domain root – configurable via env var -------------------------------------
ROOT_DOMAIN = os.getenv("ROOT_DOMAIN", "localhost")
FQDN = f"{slug}.{ROOT_DOMAIN}"

Tenant = get_tenant_model()
Domain = get_tenant_domain_model()

# ---------------------------------------------------------------------------
# 1) Client / schema
# ---------------------------------------------------------------------------

client, created = Tenant.objects.get_or_create(
    schema_name=slug,
    defaults={
        "name": f"{slug.title()} Tenant",
        "paid_until": timezone.now() + timedelta(days=365),
        "on_trial": True,
    },
)
if created:
    echo(f"Client created with schema '{slug}'")
else:
    already(f"Client with schema '{slug}' already exists")

# ---------------------------------------------------------------------------
# 2) Domain
# ---------------------------------------------------------------------------

domain, dom_created = Domain.objects.get_or_create(
    tenant=client,
    domain=FQDN,
    defaults={"is_primary": True},
)
if dom_created:
    echo(f"Primary domain '{FQDN}' linked to tenant")
else:
    already(f"Domain '{FQDN}' already exists")

# ---------------------------------------------------------------------------
# 3) Tenant migrations (only once per schema)
# ---------------------------------------------------------------------------

if created:
    echo("Running schema migrations …")
    call_command("migrate_schemas", schema_name=slug, interactive=False, verbosity=0)
    echo("Schema migrations complete")

# ---------------------------------------------------------------------------
# 4) Manager user (in tenant schema)
# ---------------------------------------------------------------------------

manager_email = args.manager_email or f"manager@{FQDN}"
manager_password = args.manager_password

with schema_context(slug):
    manager, mgr_created = CustomUser.objects.get_or_create(
        email=manager_email,
        defaults={
            "password": manager_password,
            "first_name": "Tenant",
            "last_name": "Manager",
            "is_staff": True,
            "is_superuser": False,
            "is_active": True,
        },
    )
    if mgr_created:
        manager.set_password(manager_password)
        manager.save(update_fields=["password"])
        echo(f"Manager user '{manager_email}' created")
    else:
        already(f"Manager user '{manager_email}' already exists")

    # -----------------------------------------------------------------------
    # 5) (Optional) Minimal demo data
    # -----------------------------------------------------------------------
    if not args.no_demo and created:
        bld, _ = Building.objects.get_or_create(
            name="Default Building",
            manager=manager,
            defaults={
                "address": "Οδός Demo 1",
                "city": "Αθήνα",
                "postal_code": "11111",
            },
        )
        BuildingMembership.objects.get_or_create(building=bld, resident=manager, role="manager")
        echo("Demo building seeded")

# ---------------------------------------------------------------------------
# 6) Log credentials
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(BACKEND_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, f"{slug}.log")
with open(log_file, "w") as fh:
    fh.write(f"TENANT  : {slug}\n")
    fh.write(f"DOMAIN  : http://{FQDN}:3000\n")
    fh.write("\n--- Manager ---\n")
    fh.write(f"Email   : {manager_email}\nPassword: {manager_password}\n")

echo(f"Credentials written to {log_file}")
print("\n🎉  Tenant bootstrap complete. Access tenant admin via:")
print(f"    http://{FQDN}:8000/admin/")
