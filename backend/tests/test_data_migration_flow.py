import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate


@pytest.mark.django_db
def test_data_migration_flow_analyze_validate_import(mocker):
    """
    End-to-end-ish test (χωρίς εξωτερικά AI calls):
    1) analyze-images: κάνει upload 1 εικόνα και επιστρέφει {success, data}
    2) validate-data: κάνει έλεγχο χιλιοστών (άθροισμα 1000) και επιστρέφει statistics
    3) import-data: δημιουργεί building + apartments, γράφει participation_mills, και δημιουργεί invitations χωρίς email send
    """
    from users.models import CustomUser, UserInvitation
    from buildings.models import Building
    from apartments.models import Apartment
    from data_migration import views as migration_views

    # Mock AI analyzer ώστε να μην απαιτεί πραγματικό OCR/Vision αποτέλεσμα
    extracted = {
        "building_info": {
            "name": "Migration Test Building",
            "address": "Test Address 1",
            "city": "Athens",
            "postal_code": "11111",
            "apartments_count": 2,
        },
        "apartments": [
            {
                "number": "A1",
                "owner_name": "Owner One",
                "owner_phone": "2100000001",
                "owner_email": "owner1@test.com",
                "ownership_percentage": 400,  # χιλιοστά (‰)
                "tenant_name": "",
                "tenant_email": "",
                "is_rented": False,
                "is_closed": False,
            },
            {
                "number": "A2",
                "owner_name": "Owner Two",
                "owner_phone": "2100000002",
                "owner_email": "owner2@test.com",
                "ownership_percentage": 600,  # χιλιοστά (‰)
                "tenant_name": "Tenant Two",
                "tenant_email": "tenant2@test.com",
                "is_rented": True,
                "is_closed": False,
            },
        ],
        "residents": [
            {"name": "Owner One", "email": "owner1@test.com", "apartment": "A1", "role": "owner"},
            {"name": "Owner Two", "email": "owner2@test.com", "apartment": "A2", "role": "owner"},
            {"name": "Tenant Two", "email": "tenant2@test.com", "apartment": "A2", "role": "tenant"},
        ],
        "confidence_score": 0.9,
        "extraction_notes": ["mocked"],
    }

    # Patch: ai_service.form_analyzer.analyze_form_images → returns extracted
    mocker.patch("data_migration.ai_service.form_analyzer.analyze_form_images", return_value=extracted)

    # Create staff user (IsAdminUser)
    admin_user = CustomUser.objects.create_user(
        email=f"migration-admin-{timezone.now().timestamp()}@test.com",
        password="testpass123",
        first_name="Admin",
        last_name="User",
        is_staff=True,
        is_active=True,
        email_verified=True,
    )

    factory = APIRequestFactory()

    # 1) Analyze
    img_bytes = io.BytesIO(b"fake image bytes")
    upload = SimpleUploadedFile("test.png", img_bytes.getvalue(), content_type="image/png")
    request = factory.post("/api/data-migration/analyze-images/", {"images": [upload]}, format="multipart")
    force_authenticate(request, user=admin_user)
    response = migration_views.analyze_form_images(request)
    assert response.status_code == 200
    assert response.data["success"] is True
    assert "data" in response.data
    assert response.data["data"]["building_info"]["name"] == "Migration Test Building"

    # 2) Validate (mills sum == 1000)
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
    assert response.data["statistics"]["total_mills"] == 1000
    assert response.data["statistics"]["mills_status"] == "correct"

    # 3) Import (creates building/apartments + invitations without sending email)
    import_payload = {**validate_payload, "target_building_id": "new"}
    request = factory.post("/api/data-migration/import-data/", import_payload, format="json")
    force_authenticate(request, user=admin_user)
    response = migration_views.import_migrated_data(request)
    assert response.status_code == 200
    assert response.data["success"] is True
    building_id = response.data["building_id"]
    assert response.data["apartments_created"] == 2

    building = Building.objects.get(id=building_id)
    apts = Apartment.objects.filter(building=building).order_by("number")
    assert apts.count() == 2

    # participation_mills should be set from migration mills
    apt1 = apts[0]
    apt2 = apts[1]
    assert apt1.participation_mills == 400
    assert apt2.participation_mills == 600

    # Invitations should be created for 3 unique emails (owner1, owner2, tenant2)
    invitations = UserInvitation.objects.filter(building_id=building.id, status="pending")
    assert invitations.count() == 3


