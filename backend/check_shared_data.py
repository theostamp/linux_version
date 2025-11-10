#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from tenants.models import Client, Domain

User = get_user_model()

def check_shared_data():
    """Ελέγχει και εμφανίζει τα shared δεδομένα (public tenant)"""
    
    print("🔍 Έλεγχος shared δεδομένων (public tenant)")
    print("=" * 50)
    
    # Έλεγχος tenants
    tenants = Client.objects.all()
    print(f"\n🏢 Tenants ({tenants.count()}):")
    for tenant in tenants:
        print(f"  - Schema: {tenant.schema_name}")
        print(f"    Όνομα: {tenant.name}")
        print(f"    Κατάσταση: {tenant.status}")
        print(f"    Trial: {tenant.on_trial}")
        print(f"    Ενεργός: {tenant.is_active}")
    
    # Έλεγχος domains
    domains = Domain.objects.all()
    print(f"\n🌐 Domains ({domains.count()}):")
    for domain in domains:
        print(f"  - Domain: {domain.domain}")
        print(f"    Tenant: {domain.tenant.name}")
        print(f"    Primary: {domain.is_primary}")
    
    # Έλεγχος superusers
    superusers = User.objects.filter(is_superuser=True)
    print(f"\n👑 Superusers ({superusers.count()}):")
    for user in superusers:
        print(f"  - {user.email}")
        print(f"    Όνομα: {user.first_name} {user.last_name}")
        print(f"    Staff: {user.is_staff}")
        print(f"    Active: {user.is_active}")
    
    print("\n" + "=" * 50)
    print("✅ Έλεγχος shared data ολοκληρώθηκε!")

if __name__ == "__main__":
    check_shared_data() 