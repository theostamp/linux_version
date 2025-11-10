#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model
from tenants.models import Client, Domain
from buildings.models import Building, BuildingMembership
from django_tenants.utils import tenant_context

User = get_user_model()

def show_project_status():
    """Εμφανίζει την ολική κατάσταση του project"""
    
    print("🚀 DJANGO TENANTS PROJECT - ΚΑΤΑΣΤΑΣΗ")
    print("=" * 60)
    
    # 1. Shared Data (Public Tenant)
    print("\n📊 SHARED DATA (Public Tenant)")
    print("-" * 30)
    
    tenants = Client.objects.all()
    print(f"🏢 Tenants: {tenants.count()}")
    for tenant in tenants:
        print(f"  - {tenant.schema_name}: {tenant.name} ({tenant.status})")
    
    domains = Domain.objects.all()
    print(f"🌐 Domains: {domains.count()}")
    for domain in domains:
        print(f"  - {domain.domain} → {domain.tenant.name}")
    
    superusers = User.objects.filter(is_superuser=True)
    print(f"👑 Superusers: {superusers.count()}")
    for user in superusers:
        print(f"  - {user.email}")
    
    # 2. Tenant Data
    print("\n📊 TENANT DATA")
    print("-" * 30)
    
    for tenant in tenants:
        if tenant.schema_name == 'public':
            continue
            
        print(f"\n🏢 Tenant: {tenant.name} ({tenant.schema_name})")
        print(f"   Domain: {tenant.domains.first().domain if tenant.domains.exists() else 'N/A'}")
        
        with tenant_context(tenant):
            buildings_count = Building.objects.count()
            users_count = User.objects.count()
            memberships_count = BuildingMembership.objects.count()
            
            print(f"   🏠 Buildings: {buildings_count}")
            print(f"   👥 Users: {users_count}")
            print(f"   🔗 Memberships: {memberships_count}")
            
            # Show sample buildings
            if buildings_count > 0:
                print("   Sample Buildings:")
                for building in Building.objects.all()[:3]:
                    print(f"     - {building.name} ({building.apartments_count} apts)")
    
    # 3. Database Info
    print("\n📊 DATABASE INFO")
    print("-" * 30)
    
    from django.db import connection
    print(f"Database: {connection.settings_dict['NAME']}")
    print(f"Host: {connection.settings_dict['HOST']}:{connection.settings_dict['PORT']}")
    
    # 4. Access URLs
    print("\n🌐 ACCESS URLs")
    print("-" * 30)
    print("Public Admin: http://localhost:8000/admin/")
    print("Tenant Admin: http://athinon12.localhost:8000/admin/")
    print("API Base: http://localhost:8000/api/")
    print("Frontend: http://localhost:8080/")
    
    # 5. Login Credentials
    print("\n🔑 LOGIN CREDENTIALS")
    print("-" * 30)
    print("Superuser:")
    print("  Email: theostam1966@gmail.com")
    print("  Password: admin123")
    print("\nTenant Users:")
    print("  Manager: manager@athinon12.localhost / changeme123")
    print("  Resident1: resident1@athinon12.localhost / changeme123")
    print("  Resident2: resident2@athinon12.localhost / changeme123")
    
    print("\n" + "=" * 60)
    print("✅ Project αρχικοποιήθηκε επιτυχώς!")
    print("🎉 Μπορείτε να ξεκινήσετε την ανάπτυξη!")

if __name__ == "__main__":
    show_project_status() 