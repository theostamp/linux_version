import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django_tenants.utils import schema_context
from buildings.models import Building
from users.models import CustomUser
from uuid import uuid4


pytestmark = pytest.mark.django_db


def unique_email(prefix: str) -> str:
    return f"{prefix}+{uuid4().hex[:8]}@test.com"


def test_integrity_endpoint_ok():
    with schema_context('demo'):
        building = Building.objects.create(name='Integrity Test', address='Addr')
        user = CustomUser.objects.create_user(email=unique_email('admin'), password='x', is_staff=True)
        client = APIClient(); client.force_authenticate(user=user)
        url = reverse('financial:integrity-check') + f"?building_id={building.id}"
        resp = client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert data.get('success') in [True, False]


def test_integrity_endpoint_auto_fix():
    with schema_context('demo'):
        building = Building.objects.create(name='Integrity Fix', address='Addr')
        user = CustomUser.objects.create_user(email=unique_email('admin2'), password='x', is_staff=True)
        client = APIClient(); client.force_authenticate(user=user)
        url = reverse('financial:integrity-check') + f"?building_id={building.id}&auto_fix=true"
        resp = client.get(url)
        assert resp.status_code == status.HTTP_200_OK

