# backend/tests/test_user_requests.py

import pytest
from django.urls import reverse  
      # type: ignore
from rest_framework.test import APIClient
from user_requests.models import UserRequest
from tests.factories import UserFactory, UserRequestFactory, BuildingFactory

@pytest.fixture
def user(db):
    return UserFactory(email="testuser@example.com", password="testpass")

@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.mark.django_db
def test_create_user_request(auth_client, user):
    building = BuildingFactory()
    url = reverse('userrequest-list')  # το viewset URL
    payload = {
        "title": "Σπασμένο κάγκελο",
        "description": "Το κάγκελο στον 3ο όροφο έχει σπάσει.",
        "building": building.id,
        "type": "technical"
    }
    response = auth_client.post(url, payload, format='json')

    assert response.status_code == 201
    assert UserRequest.objects.count() == 1
    assert UserRequest.objects.first().title == "Σπασμένο κάγκελο"

@pytest.mark.django_db
def test_support_user_request():
    user = UserFactory()
    building = BuildingFactory()
    request = UserRequestFactory(title="Λάμπα", created_by=user, building=building)
    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse("userrequest-support", args=[request.id])
    response = client.post(url)

    assert response.status_code == 200
    request.refresh_from_db()
    assert user in request.supporters.all()

@pytest.mark.django_db
def test_list_user_requests(auth_client, user):
    building = BuildingFactory()
    UserRequest.objects.create(
        title="A",
        description="desc",
        created_by=user,
        building=building
    )

    response = auth_client.get(reverse("userrequest-list"))
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["title"] == "A"  