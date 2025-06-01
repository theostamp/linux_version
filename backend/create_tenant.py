#!/usr/bin/env python
import os
import django  # type: ignore  # type: ignore  # type: ignore
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from tenants.models import Client, Domain
from django.contrib.auth import get_user_model  # type: ignore  # type: ignore  # type: ignore
from django.db import IntegrityError  # type: ignore  # type: ignore  # type: ignore

User = get_user_model()

def create_tenant(schema_name, name, domain_url, email):
    # Έλεγχος για υπάρχον schema
    if Client.objects.filter(schema_name=schema_name).exists():
        print(f"[⚠️] Το schema '{schema_name}' υπάρχει ήδη.")
        return

    # Δημιουργία Client
    client = Client(
        schema_name=schema_name,
        name=name,
        paid_until="2099-12-31",  # Προαιρετικό
        on_trial=False,
    )
    client.save()
    print(f"[✅] Δημιουργήθηκε schema '{schema_name}'.")

    # Δημιουργία Domain (tenant host mapping)
    domain = Domain()
    domain.domain = domain_url
    domain.tenant = client
    domain.is_primary = True
    domain.save()
    print(f"[✅] Δημιουργήθηκε domain '{domain_url}' για το tenant '{schema_name}'.")

    # Δημιουργία διαχειριστή (Office Manager)
    try:
        user = User.objects.create_user(
            email=email,
            password="changeme123",  # 🔒 Καλό είναι να αλλάξει μετά
            is_staff=True,
        )
        print(f"[✅] Δημιουργήθηκε χρήστης '{email}' με ρόλο staff.")
    except IntegrityError:
        print(f"[⚠️] Υπάρχει ήδη χρήστης με email '{email}'.")

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Χρήση: python create_tenant.py <schema_name> <name> <domain_url> <email>")
        sys.exit(1)

    schema_name, name, domain_url, email = sys.argv[1:5]
    create_tenant(schema_name, name, domain_url, email)
