#!/usr/bin/env python
"""
Utility script to (re)create demo data for a specific tenant.

Usage:
    python fix_tenant_theo_demo_data.py
    python fix_tenant_theo_demo_data.py --schema theo
"""

import argparse
import os
import sys
from pathlib import Path

import django


def bootstrap_django():
    """Configure Django settings so the script can run from backend/ or repo root."""
    script_dir = Path(__file__).resolve().parent
    
    # Check if we're already in the backend directory
    if (script_dir / "manage.py").exists():
        # We're in the backend directory
        backend_dir = script_dir
    else:
        # We're in the repo root, look for backend/
        backend_dir = script_dir / "backend"
        if not backend_dir.exists():
            raise RuntimeError(
                f"Unable to locate backend directory. "
                f"Script is at: {script_dir}, looking for: {backend_dir}"
            )

    sys.path.insert(0, str(backend_dir))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
    django.setup()


def create_demo_data(schema_name: str, force: bool = False):
    from django_tenants.utils import schema_context, get_tenant_model
    from tenants.services import TenantService

    TenantModel = get_tenant_model()

    print("=" * 80)
    print(f"FIXING TENANT '{schema_name}' - Adding Demo Data")
    print("=" * 80)
    print()

    try:
        tenant = TenantModel.objects.get(schema_name=schema_name)
        print(f"✅ Found tenant: {tenant.name} (schema: {tenant.schema_name})")
        print()

        with schema_context(schema_name):
            from buildings.models import Building
            from apartments.models import Apartment
            from buildings.models import BuildingMembership

            building_count = Building.objects.count()
            apartment_count = Apartment.objects.count()
            has_demo_building = Building.objects.filter(name__icontains="Αλκμάνος").exists()

            print("📊 Current State:")
            print(f"   Buildings: {building_count}")
            print(f"   Apartments: {apartment_count}")
            print(f"   Has demo building (Αλκμάνος 22): {'yes' if has_demo_building else 'no'}")
            print()

            if has_demo_building and not force:
                print("✅ Demo building already present. Use --force to recreate it.")
                for building in Building.objects.all():
                    apts = Apartment.objects.filter(building=building).count()
                    print(f"   - {building.name}: {apts} apartments")
                print()
                return

            if force:
                print("⚠️ Force flag detected: removing existing demo building data...")
                BuildingMembership.objects.filter(
                    building__name__icontains="Αλκμάνος"
                ).delete()
                Apartment.objects.filter(
                    building__name__icontains="Αλκμάνος"
                ).delete()
                Building.objects.filter(
                    name__icontains="Αλκμάνος"
                ).delete()
                print("🧹 Existing demo data removed.")
                print()

        print("🏗️ Creating demo data for tenant...")
        tenant_service = TenantService()
        tenant_service._create_demo_data(schema_name)  # pylint: disable=protected-access

        with schema_context(schema_name):
            from buildings.models import Building
            from apartments.models import Apartment

            building_count = Building.objects.count()
            apartment_count = Apartment.objects.count()

            print()
            print("=" * 80)
            print("✅ DEMO DATA CREATED SUCCESSFULLY!")
            print("=" * 80)
            print(f"   Buildings: {building_count}")
            print(f"   Apartments: {apartment_count}")
            print()

            for building in Building.objects.all():
                apts = Apartment.objects.filter(building=building).count()
                print(f"   📍 {building.name}")
                print(f"      Address: {building.address}")
                print(f"      Apartments: {apts}")
                print()

    except TenantModel.DoesNotExist:
        print(f"❌ Tenant '{schema_name}' not found in database!")
        print()
        print("Available tenants:")
        for tenant in TenantModel.objects.all():
            print(f"  - {tenant.schema_name} ({tenant.name})")
        print()
        raise SystemExit(1) from None
    except Exception as exc:  # pylint: disable=broad-except
        print(f"❌ Error while creating demo data: {exc}")
        raise
    finally:
        print("=" * 80)
        print("🎉 Done")
        print("=" * 80)
        print(f"Test at: https://{schema_name}.newconcierge.app/")
        print()


def main():
    parser = argparse.ArgumentParser(description="Create demo data for a tenant schema.")
    parser.add_argument(
        "--schema",
        default="theo",
        help="Target tenant schema (default: theo)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recreate demo building even if it already exists",
    )
    args = parser.parse_args()

    bootstrap_django()
    create_demo_data(args.schema, force=args.force)


if __name__ == "__main__":
    main()


