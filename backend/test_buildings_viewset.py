
# tests/test_buildings_viewset.py

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from buildings.models import Building, BuildingMembership
from users.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superuser(db):
    return CustomUser.objects.create_superuser(
        email="super@example.com",
        password="superpass",
        first_name="Super",
        last_name="User",
        role="admin",
    )


@pytest.fixture
def office_manager(db):
    return CustomUser.objects.create_user(
        email="manager@example.com",
        password="managerpass",
        first_name="Office",
        last_name="Manager",
        role="manager",
        is_staff=True,
    )


@pytest.fixture
def resident(db):
    return CustomUser.objects.create_user(
        email="resident@example.com",
        password="residentpass",
        first_name="John",
        last_name="Doe",
    )


@pytest.fixture
def building(db, office_manager):
    return Building.objects.create(name="Test Building", address="123 Street", manager=office_manager)


@pytest.mark.django_db
def test_superuser_can_list_all_buildings(api_client, superuser, building):
    api_client.force_authenticate(user=superuser)
    response = api_client.get(reverse("building-list"))
    assert response.status_code == 200
    assert len(response.data) >= 1


@pytest.mark.django_db
def test_office_manager_can_list_own_buildings(api_client, office_manager, building):
    api_client.force_authenticate(user=office_manager)
    response = api_client.get(reverse("building-list"))
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["id"] == building.id


@pytest.mark.django_db
def test_resident_can_list_own_building(api_client, resident, building):
    BuildingMembership.objects.create(resident=resident, building=building)
    api_client.force_authenticate(user=resident)
    response = api_client.get(reverse("building-list"))
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["id"] == building.id


@pytest.mark.django_db
def test_assign_resident(api_client, superuser, resident, building):
    api_client.force_authenticate(user=superuser)
    payload = {
        "user_email": resident.email,
        "building": building.id,
        "role": "resident"
    }
    response = api_client.post(reverse("building-assign-resident"), data=payload)
    assert response.status_code == 200
    assert BuildingMembership.objects.filter(building=building, resident=resident).exists()


@pytest.mark.django_db
def test_memberships_list(api_client, office_manager, building, resident):
    BuildingMembership.objects.create(building=building, resident=resident)
    api_client.force_authenticate(user=office_manager)
    response = api_client.get(reverse("building-memberships"), data={"building_id": building.id})
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["resident"] == resident.id
