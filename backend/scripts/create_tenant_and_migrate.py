# /home/theo/projects/linux_version/backend/scripts/create_tenant_and_migrate.py

import os
import django
import sys
import subprocess

# Προσθέτει το backend/ στο sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from tenants.models import Client, Domain

def create_tenant_and_migrate(schema_name, name, domain):
    if Client.objects.filter(schema_name=schema_name).exists():
        print(f"⚠️ Tenant '{schema_name}' already exists.")
        return

    # Δημιουργία tenant και domain
    tenant = Client(schema_name=schema_name, name=name)
    tenant.save()
    Domain.objects.create(domain=domain, tenant=tenant, is_primary=True)
    print(f"✅ Created tenant '{schema_name}' with domain '{domain}'")

    # Εκτέλεση migrations
    subprocess.run([
        "python", "manage.py", "migrate_schemas",
        "--tenant", "--schema", schema_name
    ], check=True)

    # Εκτέλεση setup script για τον tenant με σωστό working directory
    subprocess.run([
        "python", "scripts/initial_user_setup.py"
    ], check=True, env={**os.environ, "TENANT_SCHEMA": schema_name}, cwd="/app")

if __name__ == "__main__":
    create_tenant_and_migrate(
        schema_name="demo2",
        name="Demo 2 Building",
        domain="demo2.localhost"
    )
    create_tenant_and_migrate(
        schema_name="demo3",
        name="Demo 3 Building",
        domain="demo3.localhost"
    )