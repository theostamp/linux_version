from contextlib import contextmanager
from unittest.mock import patch
from django.test import RequestFactory
from django.test import override_settings
from django_tenants.test.cases import TenantTestCase

from buildings.models import Building
from apartments.models import Apartment
from kiosk.token_utils import generate_kiosk_token
from public_info.views import building_info


@contextmanager
def noop_schema_context(_schema_name: str):
    yield


class PublicInfoSecurityTests(TenantTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.building = Building.objects.create(
            name="Public Info Building",
            address="Test Address",
            financial_system_start_date=None,
        )
        Apartment.objects.create(
            building=self.building,
            number="101",
            floor=1,
            owner_name="Owner One",
            participation_mills=100,
        )

    @override_settings(ENABLE_SECURE_PUBLIC_INFO=True, ENABLE_KIOSK_SIGNED_QR=True)
    def test_public_info_sanitizes_without_token(self):
        request = self.factory.get(f"/api/public-info/{self.building.id}/")
        with patch('public_info.views.schema_context', noop_schema_context), \
             patch('public_info.views.TenantDomain.objects.filter') as mock_filter:
            mock_filter.return_value.select_related.return_value.first.return_value = None
            response = building_info(request, self.building.id)
        self.assertEqual(response.status_code, 200)
        financial = response.data.get('financial', {})
        self.assertEqual(financial.get('apartment_statuses'), [])

    @override_settings(ENABLE_SECURE_PUBLIC_INFO=True, ENABLE_KIOSK_SIGNED_QR=True)
    def test_public_info_allows_with_valid_token(self):
        token = generate_kiosk_token(self.building.id)
        request = self.factory.get(
            f"/api/public-info/{self.building.id}/?kiosk_token={token}"
        )
        with patch('public_info.views.schema_context', noop_schema_context), \
             patch('public_info.views.TenantDomain.objects.filter') as mock_filter:
            mock_filter.return_value.select_related.return_value.first.return_value = None
            response = building_info(request, self.building.id)
        self.assertEqual(response.status_code, 200)
        financial = response.data.get('financial', {})
        self.assertIsInstance(financial.get('apartment_statuses'), list)
        self.assertGreaterEqual(len(financial.get('apartment_statuses', [])), 1)
