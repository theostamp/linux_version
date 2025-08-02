#!/usr/bin/env python
"""
🏢 Script Διαχείρισης Tenants (Ultra-Superuser)
===============================================
Επιτρέπει στον ultra-superuser να διαχειριστεί tenants.
"""

import os
import sys
import django
import argparse
from datetime import timedelta
from django.utils import timezone

# Προσθήκη backend στον PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.core.management import call_command
from django_tenants.utils import get_tenant_model, get_tenant_domain_model, schema_context, schema_exists
from users.models import CustomUser

def list_tenants():
    """Εμφάνιση όλων των tenants"""
    print("🏢 ΛΙΣΤΑ TENANTS")
    print("=" * 50)
    
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    
    tenants = TenantModel.objects.all()
    
    for tenant in tenants:
        print(f"\n📋 Tenant: {tenant.name}")
        print(f"   Schema: {tenant.schema_name}")
        print(f"   Active: {tenant.is_active}")
        print(f"   Trial: {tenant.on_trial}")
        print(f"   Paid until: {tenant.paid_until}")
        
        # Domains
        domains = DomainModel.objects.filter(tenant=tenant)
        for domain in domains:
            print(f"   Domain: {domain.domain} (Primary: {domain.is_primary})")
        
        # Users count
        if tenant.schema_name != 'public':
            with schema_context(tenant.schema_name):
                user_count = CustomUser.objects.count()
                print(f"   Users: {user_count}")

def create_tenant(tenant_name, domain_name=None, tenant_display_name=None):
    """Δημιουργία νέου tenant"""
    print(f"🏢 Δημιουργία tenant: {tenant_name}")
    
    TenantModel = get_tenant_model()
    DomainModel = get_tenant_domain_model()
    
    if not domain_name:
        domain_name = f"{tenant_name}.localhost"
    
    if not tenant_display_name:
        tenant_display_name = f"{tenant_name.title()} Digital Concierge"
    
    # Έλεγχος αν υπάρχει ήδη
    if schema_exists(tenant_name):
        print(f"❌ Το tenant '{tenant_name}' υπάρχει ήδη")
        return False
    
    # Δημιουργία tenant
    tenant = TenantModel(
        schema_name=tenant_name,
        name=tenant_display_name,
        paid_until=timezone.now() + timedelta(days=365),
        on_trial=True,
        is_active=True
    )
    tenant.save()
    print(f"✅ Δημιουργήθηκε tenant: {tenant.name}")
    
    # Δημιουργία domain
    domain = DomainModel()
    domain.domain = domain_name
    domain.tenant = tenant
    domain.is_primary = True
    domain.save()
    print(f"✅ Δημιουργήθηκε domain: {domain.domain}")
    
    # Migrations για το νέο schema
    print("🔄 Εκτέλεση migrations για το νέο tenant...")
    call_command("migrate_schemas", schema_name=tenant.schema_name, interactive=False)
    
    print(f"\n✅ Tenant δημιουργήθηκε επιτυχώς!")
    print(f"🌐 Frontend: http://{domain_name}:8080")
    print(f"🔧 Admin: http://{domain_name}:8000/admin/")
    
    return True

def delete_tenant(tenant_name):
    """Διαγραφή tenant"""
    print(f"🗑️ Διαγραφή tenant: {tenant_name}")
    
    TenantModel = get_tenant_model()
    
    try:
        tenant = TenantModel.objects.get(schema_name=tenant_name)
        
        if tenant.schema_name == 'public':
            print("❌ Δεν μπορείτε να διαγράψετε το public tenant")
            return False
        
        # Διαγραφή tenant (αυτό διαγράφει και το schema)
        tenant.delete()
        print(f"✅ Το tenant '{tenant_name}' διαγράφηκε επιτυχώς")
        return True
        
    except TenantModel.DoesNotExist:
        print(f"❌ Το tenant '{tenant_name}' δεν βρέθηκε")
        return False

def create_tenant_admin(tenant_name, email, password, first_name="Admin", last_name="User"):
    """Δημιουργία admin για συγκεκριμένο tenant"""
    print(f"🔧 Δημιουργία admin για tenant {tenant_name}: {email}")
    
    if not schema_exists(tenant_name):
        print(f"❌ Το tenant '{tenant_name}' δεν υπάρχει")
        return False
    
    with schema_context(tenant_name):
        # Έλεγχος αν υπάρχει ήδη
        if CustomUser.objects.filter(email=email).exists():
            user = CustomUser.objects.get(email=email)
            print(f"ℹ️ Ο χρήστης {email} υπάρχει ήδη")
            
            # Ενημέρωση δικαιωμάτων
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.set_password(password)
            user.save()
            print(f"✅ Ενημερώθηκαν τα δικαιώματα για {email}")
            return True
        else:
            # Δημιουργία νέου admin
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            print(f"✅ Δημιουργήθηκε νέος admin: {email}")
            return True

def main():
    parser = argparse.ArgumentParser(description="🏢 Διαχείριση Tenants (Ultra-Superuser)")
    parser.add_argument("--list", action="store_true", help="Εμφάνιση όλων των tenants")
    parser.add_argument("--create", help="Δημιουργία νέου tenant")
    parser.add_argument("--domain", help="Domain για το νέο tenant")
    parser.add_argument("--name", help="Display name για το νέο tenant")
    parser.add_argument("--delete", help="Διαγραφή tenant")
    parser.add_argument("--create-admin", help="Δημιουργία admin για tenant")
    parser.add_argument("--admin-email", help="Email του admin")
    parser.add_argument("--admin-password", help="Password του admin")
    parser.add_argument("--admin-first-name", default="Admin", help="Όνομα του admin")
    parser.add_argument("--admin-last-name", default="User", help="Επώνυμο του admin")
    
    args = parser.parse_args()
    
    if args.list:
        list_tenants()
    elif args.create:
        create_tenant(args.create, args.domain, args.name)
    elif args.delete:
        delete_tenant(args.delete)
    elif args.create_admin:
        if not args.admin_email or not args.admin_password:
            print("❌ Χρειάζονται --admin-email και --admin-password")
            return
        create_tenant_admin(
            args.create_admin,
            args.admin_email,
            args.admin_password,
            args.admin_first_name,
            args.admin_last_name
        )
    else:
        print("❌ Χρειάζεται κάποια ενέργεια")
        print("Χρήση:")
        print("  python manage_tenants.py --list")
        print("  python manage_tenants.py --create mycompany --domain mycompany.localhost")
        print("  python manage_tenants.py --delete mycompany")
        print("  python manage_tenants.py --create-admin mycompany --admin-email admin@mycompany.localhost --admin-password mypassword")

if __name__ == "__main__":
    main()