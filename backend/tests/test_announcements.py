import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from tests.factories import UserFactory, AnnouncementFactory

@pytest.mark.django_db
def test_create_announcement():
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)

    data = {
        "title": "Factory Announcement",
        "description": "Generated via test",
        "start_date": "2025-05-01",
        "end_date": "2025-05-31"
    }

    response = client.post(reverse("announcement-list"), data, content_type="application/json")
    assert response.status_code == 201
    assert response.data["title"] == data["title"]

@pytest.mark.django_db
def test_list_announcements():
    AnnouncementFactory.create_batch(3)
    client = APIClient()
    response = client.get(reverse("announcement-list"))
    assert response.status_code == 200
    assert len(response.data["results"]) == 3
