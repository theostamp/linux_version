#!/usr/bin/env python3
"""
Smoke test για τη ροή Data Migration, χωρίς pytest και χωρίς δημιουργία test DB.

Τρέχει πάνω στο ΥΠΑΡΧΟΝ DB (concierge_db) και στο tenant schema 'demo'.
Κάνει:
1) analyze-images (με mock του AI analyzer)
2) validate-data (έλεγχος χιλιοστών = 1000)
3) import-data (δημιουργία building + apartments + invitations χωρίς αποστολή email)

Στο τέλος κάνει cleanup τα δεδομένα που δημιούργησε.
"""

import io
import os
import sys
from contextlib import suppress
from unittest.mock import patch

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate
from django_tenants.utils import schema_context

from tenants.models import Client
from users.models import CustomUser, UserInvitation
from data_migration import views as migration_views
from buildings.models import Building
from apartments.models import Apartment


def main() -> int:
    extracted = {
        "building_info": {
            "name": "SMOKE Migration Test Building",
            "address": "Smoke Address 1",
            "city": "Athens",
            "postal_code": "11111",
            "apartments_count": 2,
        },
        "apartments": [
            {
                "number": "A1",
                "owner_name": "Owner One",
                "owner_phone": "2100000001",
                "owner_email": "owner1+smoke@test.com",
                "ownership_percentage": 400,  # mills (‰)
                "tenant_name": "",
                "tenant_email": "",
                "is_rented": False,
                "is_closed": False,
            },
            {
                "number": "A2",
                "owner_name": "Owner Two",
                "owner_phone": "2100000002",
                "owner_email": "owner2+smoke@test.com",
                "ownership_percentage": 600,  # mills (‰)
                "tenant_name": "Tenant Two",
                "tenant_email": "tenant2+smoke@test.com",
                "is_rented": True,
                "is_closed": False,
            },
        ],
        "residents": [
            {"name": "Owner One", "email": "owner1+smoke@test.com", "apartment": "A1", "role": "owner"},
            {"name": "Owner Two", "email": "owner2+smoke@test.com", "apartment": "A2", "role": "owner"},
            {"name": "Tenant Two", "email": "tenant2+smoke@test.com", "apartment": "A2", "role": "tenant"},
        ],
        "confidence_score": 0.9,
        "extraction_notes": ["smoke-mocked"],
    }

    # Create a temporary admin user in PUBLIC schema, tied to demo tenant
    with schema_context("public"):
        demo_tenant = Client.objects.get(schema_name="demo")
        admin_user = CustomUser.objects.create_user(
            email="smoke-migration-admin@test.com",
            password="testpass123",
            first_name="Smoke",
            last_name="Admin",
            is_staff=True,
            is_active=True,
            email_verified=True,
            tenant=demo_tenant,
        )

    created_building_id = None

    try:
        factory = APIRequestFactory()

        with patch("data_migration.ai_service.form_analyzer.analyze_form_images", return_value=extracted):
            # Run inside tenant schema
            with schema_context("demo"):
                # 1) Analyze
                img_bytes = io.BytesIO(b"fake image bytes")
                upload = SimpleUploadedFile("test.png", img_bytes.getvalue(), content_type="image/png")
                request = factory.post("/api/data-migration/analyze-images/", {"images": [upload]}, format="multipart")
                force_authenticate(request, user=admin_user)
                response = migration_views.analyze_form_images(request)
                assert response.status_code == 200
                assert response.data["success"] is True

                # 2) Validate
                validate_payload = {
                    "building_info": extracted["building_info"],
                    "apartments": extracted["apartments"],
                    "residents": extracted["residents"],
                }
                request = factory.post("/api/data-migration/validate-data/", validate_payload, format="json")
                force_authenticate(request, user=admin_user)
                response = migration_views.validate_migration_data(request)
                assert response.status_code == 200
                assert response.data["is_valid"] is True
                assert response.data.get("statistics", {}).get("total_mills") == 1000
                assert response.data.get("statistics", {}).get("mills_status") == "correct"

                # 3) Import
                import_payload = {**validate_payload, "target_building_id": "new"}
                request = factory.post("/api/data-migration/import-data/", import_payload, format="json")
                force_authenticate(request, user=admin_user)
                response = migration_views.import_migrated_data(request)
                assert response.status_code == 200
                assert response.data["success"] is True
                created_building_id = response.data["building_id"]

                building = Building.objects.get(id=created_building_id)
                apartments = Apartment.objects.filter(building=building).order_by("number")
                assert apartments.count() == 2
                assert apartments[0].participation_mills == 400
                assert apartments[1].participation_mills == 600

        # Invitations are in PUBLIC schema (shared app)
        with schema_context("public"):
            invitations = UserInvitation.objects.filter(building_id=created_building_id, status="pending")
            assert invitations.count() == 3

        print("✅ SMOKE OK: analyze → validate → import λειτούργησαν σωστά (με mock AI) και έγινε cleanup στο τέλος.")
        return 0

    except AssertionError as e:
        print(f"❌ SMOKE FAIL: {e}")
        return 1
    except Exception as e:
        print(f"❌ SMOKE ERROR: {e}")
        return 2
    finally:
        # Cleanup
        with suppress(Exception):
            if created_building_id:
                with schema_context("demo"):
                    Building.objects.filter(id=created_building_id).delete()

        with suppress(Exception):
            with schema_context("public"):
                # Deleting admin_user will cascade delete invitations invited_by=admin_user
                CustomUser.objects.filter(email="smoke-migration-admin@test.com").delete()


if __name__ == "__main__":
    sys.exit(main())


