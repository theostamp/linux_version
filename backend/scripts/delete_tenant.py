# backend/scripts/delete_tenant.py

import os
import sys
import django
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_exists
from django.db import connection

def delete_schema(schema_name):
    with connection.cursor() as cursor:
        cursor.execute(f'DROP SCHEMA "{schema_name}" CASCADE;')

def main():
    parser = argparse.ArgumentParser(description="Διαγραφή tenant και schema σε multi-tenant Django (django-tenants).")
    parser.add_argument("schema", help="Όνομα schema/tenant προς διαγραφή")
    args = parser.parse_args()

    schema_name = args.schema.strip().lower()
    if schema_name in ['public', 'postgres', 'information_schema']:
        print(f"❌ Απαγορεύεται η διαγραφή του schema '{schema_name}'.")
        sys.exit(1)

    tenant_model = get_tenant_model()
    domain_model = get_tenant_domain_model()

    try:
        tenant = tenant_model.objects.get(schema_name=schema_name)
    except tenant_model.DoesNotExist:
        print(f"❌ Δεν βρέθηκε tenant με schema '{schema_name}'.")
        # Αν υπάρχει μόνο το schema, σβήσ' το!
        if schema_exists(schema_name):
            try:
                delete_schema(schema_name)
                print(f"✅ Διαγράφηκε το schema '{schema_name}' (χωρίς εγγραφή tenant).")
            except Exception as e:
                print(f"⚠️ Σφάλμα στη διαγραφή schema: {e}")
        sys.exit(1)

    confirm = input(f"⚠️ Θέλεις σίγουρα να διαγράψεις ΟΡΙΣΤΙΚΑ το tenant '{schema_name}' και όλα τα δεδομένα του; (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ Ακυρώθηκε η διαγραφή.")
        sys.exit(0)

    try:
        if schema_exists(schema_name):
            delete_schema(schema_name)
            print(f"✅ Διαγράφηκε το schema '{schema_name}'.")
        else:
            print(f"ℹ️ Το schema '{schema_name}' δεν υπάρχει (ίσως είχε ήδη διαγραφεί).")
    except Exception as e:
        print(f"⚠️ Σφάλμα στη διαγραφή schema: {e}")

    # Διαγραφή domains
    try:
        domains = domain_model.objects.filter(tenant=tenant)
        domains_count = domains.count()
        domains.delete()
        if domains_count:
            print(f"✅ Διαγράφηκαν {domains_count} domain(s) για τον tenant.")
    except Exception as e:
        print(f"⚠️ Σφάλμα στη διαγραφή domains: {e}")

    # Διαγραφή εγγραφής tenant
    try:
        tenant.delete()
        print(f"✅ Διαγράφηκε η εγγραφή tenant για schema '{schema_name}'.")
    except Exception as e:
        print(f"⚠️ Σφάλμα στη διαγραφή tenant object: {e}")

if __name__ == "__main__":
    main()
