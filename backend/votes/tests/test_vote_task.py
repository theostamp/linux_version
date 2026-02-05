from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIClient

from buildings.models import Building
from todo_management.models import TodoItem, TodoLink
from users.models import CustomUser
from votes.models import Vote


class VoteTaskCreationTests(TenantTestCase):
    def setUp(self):
        self.client = APIClient()
        self.building = Building.objects.create(
            name="Vote Task Building",
            address="Test Address",
            financial_system_start_date=timezone.now().date(),
        )
        self.user = CustomUser.objects.create_user(
            email="manager@example.com",
            password="pass1234",
            role=CustomUser.SystemRole.OFFICE_MANAGER,
            is_active=True,
        )
        self.client.force_authenticate(self.user)
        self.vote = Vote.objects.create(
            title="Test Vote",
            description="Decision test",
            start_date=timezone.now().date(),
            building=self.building,
            creator=self.user,
        )

    def test_create_task_idempotent(self):
        url = f"/api/votes/{self.vote.id}/create-task/"

        first = self.client.post(url, {"title": "Execute decision"}, format="json")
        second = self.client.post(url, {"title": "Execute decision"}, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(TodoItem.objects.count(), 1)
        self.assertEqual(TodoLink.objects.count(), 1)
        self.assertTrue(first.data.get("created"))
        self.assertFalse(second.data.get("created"))
