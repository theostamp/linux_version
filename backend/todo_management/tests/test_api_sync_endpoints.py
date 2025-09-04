from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model

from buildings.models import Building


class TodoSyncApiTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='admin@example.com', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.building = Building.objects.create(name='API Test Building', address='Addr', city='City', postal_code='00000')

    def test_sync_financial_overdues_endpoint(self):
        url = "/api/todos/items/sync-financial-overdues/"
        resp = self.client.post(f"{url}?building={self.building.id}")
        self.assertIn(resp.status_code, [200, 201])
        self.assertIn('created', resp.data)

    def test_sync_maintenance_schedule_endpoint(self):
        url = "/api/todos/items/sync-maintenance-schedule/"
        resp = self.client.post(f"{url}?building={self.building.id}")
        self.assertIn(resp.status_code, [200, 201])
        self.assertIn('created', resp.data)


