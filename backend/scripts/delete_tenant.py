# backend/scripts/delete_tenant.py

import os
import sys
import django
import argparse

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_exists
from django.db import connection, ProgrammingError

def delete_schema(schema_name):
    """Διαγράφει το schema από τη βάση (CASCADE)"""
    with connection.cursor() as cursor:
        try:
            cursor.execute(f'DROP SCHEMA "{schema_name}" CASCADE;')
        except ProgrammingError as e:
            print(f"⚠️ Σφάλμα SQL κατά τη διαγραφή schema '{schema_name}': {e}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Διαγραφή tenant και schema σε multi-tenant Django (django-tenants).")
    parser.add_argument("schema", help="Όνομα schema/tenant προς διαγραφή")
    args = parser.parse_args()

    schema_name = args.schema.strip().lower()

    # Αποτροπή διαγραφής κρίσιμων schemas
    forbidden = {"public", "postgres", "information_schema", "pg_catalog"}
    if schema_name in forbidden:
        print(f"❌ Απαγορεύεται η διαγραφή του schema '{schema_name}'.")
        sys.exit(1)

    tenant_model = get_tenant_model()
    domain_model = get_tenant_domain_model()

    # Έλεγχος ύπαρξης tenant εγγραφής
    try:
        tenant = tenant_model.objects.get(schema_name=schema_name)
    except tenant_model.DoesNotExist:
        print(f"❌ Δεν βρέθηκε tenant με schema '{schema_name}'.")
        if schema_exists(schema_name):
            confirm = input(f"⚠️ Θες να διαγραφεί μόνο το schema '{schema_name}'; (yes/no): ")
            if confirm.lower() == "yes":
                try:
                    delete_schema(schema_name)
                    print(f"✅ Διαγράφηκε το schema '{schema_name}' (χωρίς tenant object).")
                except Exception as e:
                    print(f"⚠️ Σφάλμα: {e}")
            else:
                print("❌ Ακυρώθηκε η διαγραφή.")
        sys.exit(1)

    # Επιβεβαίωση πλήρους διαγραφής
    confirm = input(f"⚠️ Θέλεις σίγουρα να διαγράψεις ΟΡΙΣΤΙΚΑ τον tenant '{schema_name}' και όλα τα δεδομένα του; (yes/no): ")
    if confirm.lower() != "yes":
        print("❌ Ακυρώθηκε η διαγραφή.")
        sys.exit(0)

    # Διαγραφή schema
    if schema_exists(schema_name):
        try:
            delete_schema(schema_name)
            print(f"✅ Διαγράφηκε το schema '{schema_name}'.")
        except Exception as e:
            print(f"⚠️ Σφάλμα στη διαγραφή schema: {e}")
    else:
        print(f"ℹ️ Το schema '{schema_name}' δεν υπάρχει (ίσως είχε ήδη διαγραφεί).")

    # Διαγραφή domains
    try:
        domains = domain_model.objects.filter(tenant=tenant)
        count = domains.count()
        domains.delete()
        print(f"✅ Διαγράφηκαν {count} domain(s) του tenant.")
    except Exception as e:
        print(f"⚠️ Σφάλμα στη διαγραφή domains: {e}")

    # Διαγραφή tenant εγγραφής
    try:
        tenant.delete()
        print(f"✅ Διαγράφηκε η εγγραφή tenant για schema '{schema_name}'.")
    except Exception as e:
        print(f"⚠️ Σφάλμα στη διαγραφή tenant object: {e}")

if __name__ == "__main__":
    main()
