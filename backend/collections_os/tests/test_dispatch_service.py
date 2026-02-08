from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.db import connection
from django_tenants.test.cases import TenantTestCase

from apartments.models import Apartment
from buildings.models import Building
from users.models import CustomUser

from collections_os.models import (
    DunningChannel,
    DunningEvent,
    DunningEventStatus,
    DunningPolicy,
    DunningRun,
    DunningRunSource,
    DunningRunStatus,
)
from collections_os.services import dispatch_run_events, queue_run_dispatch


class CollectionsDispatchServiceTests(TenantTestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="collections.manager@example.com",
            password="testpass123",
            role="manager",
            is_active=True,
        )

        self.building = Building.objects.create(
            name="Collections Test Building",
            address="Test Street 10",
            city="Athens",
            postal_code="11111",
            apartments_count=1,
            management_fee_per_apartment=Decimal("50.00"),
            financial_system_start_date=date(2025, 1, 1),
        )

        self.apartment = Apartment.objects.create(
            building=self.building,
            number="A1",
            owner_name="Owner A1",
            owner_email="owner-a1@example.com",
            participation_mills=1000,
        )

        self.policy = DunningPolicy.objects.create(
            building=self.building,
            name="Email Policy",
            channel=DunningChannel.EMAIL,
            created_by=self.user,
        )

    def _create_run_with_event(self) -> tuple[DunningRun, DunningEvent]:
        run = DunningRun.objects.create(
            building=self.building,
            policy=self.policy,
            source=DunningRunSource.MANUAL,
            status=DunningRunStatus.RUNNING,
            month="2026-02",
            idempotency_key=f"collections-run-{self.building.id}",
            triggered_by=self.user,
        )

        event = DunningEvent.objects.create(
            run=run,
            policy=self.policy,
            building=self.building,
            apartment=self.apartment,
            channel=DunningChannel.EMAIL,
            status=DunningEventStatus.QUEUED,
            recipient=self.apartment.owner_email,
            days_overdue=45,
            amount_due=Decimal("120.00"),
            payload={"apartment_id": self.apartment.id},
        )
        return run, event

    def test_dispatch_run_events_marks_event_sent(self):
        run, event = self._create_run_with_event()

        with patch(
            "collections_os.services.NotificationService.create_notification",
            return_value=SimpleNamespace(id=1234),
        ) as create_notification_mock, patch(
            "collections_os.services.NotificationService.add_recipients"
        ) as add_recipients_mock, patch(
            "collections_os.services.NotificationService.send_notification",
            return_value={"successful": 1, "failed": 0, "total": 1},
        ) as send_notification_mock:
            dispatch_run_events(run)

        run.refresh_from_db()
        event.refresh_from_db()

        self.assertEqual(run.status, DunningRunStatus.COMPLETED)
        self.assertEqual(run.total_sent, 1)
        self.assertEqual(run.total_failed, 0)
        self.assertEqual(event.status, DunningEventStatus.SENT)
        self.assertEqual(event.provider_message_id, "1234")
        create_notification_mock.assert_called_once()
        add_recipients_mock.assert_called_once()
        send_notification_mock.assert_called_once()

    def test_queue_run_dispatch_stores_task_id(self):
        run, _ = self._create_run_with_event()

        with patch("collections_os.tasks.dispatch_dunning_run_task.delay") as delay_mock:
            delay_mock.return_value.id = "dispatch-task-1"
            task_id = queue_run_dispatch(run, schema_name=connection.schema_name)

        run.refresh_from_db()
        self.assertEqual(task_id, "dispatch-task-1")
        self.assertEqual(run.status, DunningRunStatus.RUNNING)
        self.assertEqual((run.metadata or {}).get("dispatch_task_id"), "dispatch-task-1")

    def test_queue_run_dispatch_without_queued_events_finishes_immediately(self):
        run = DunningRun.objects.create(
            building=self.building,
            policy=self.policy,
            source=DunningRunSource.MANUAL,
            status=DunningRunStatus.RUNNING,
            month="2026-02",
            idempotency_key=f"collections-run-empty-{self.building.id}",
            triggered_by=self.user,
        )

        task_id = queue_run_dispatch(run, schema_name=connection.schema_name)
        run.refresh_from_db()

        self.assertIsNone(task_id)
        self.assertEqual(run.status, DunningRunStatus.COMPLETED)
        self.assertIsNotNone(run.finished_at)
