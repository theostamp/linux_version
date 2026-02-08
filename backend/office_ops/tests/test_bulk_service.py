from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.db import connection
from django_tenants.test.cases import TenantTestCase

from apartments.models import Apartment
from buildings.models import Building
from office_finance.models import OfficeIncome
from office_ops.models import BulkJob, BulkJobItemStatus, BulkJobStatus, BulkOperationType
from office_ops.services import build_dry_run, execute_job, queue_job_execution
from users.models import CustomUser


class OfficeOpsBulkServiceTests(TenantTestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="bulk.manager@example.com",
            password="testpass123",
            role="manager",
            is_active=True,
        )

        self.building = Building.objects.create(
            name="Bulk Test Building",
            address="Test Street 1",
            city="Athens",
            postal_code="11111",
            apartments_count=2,
            management_fee_per_apartment=Decimal("60.00"),
            financial_system_start_date=date(2025, 1, 1),
        )

        Apartment.objects.create(
            building=self.building,
            number="A1",
            owner_name="Owner A1",
            participation_mills=500,
        )
        Apartment.objects.create(
            building=self.building,
            number="A2",
            owner_name="Owner A2",
            participation_mills=500,
        )

    def test_dry_run_builds_validated_items_for_monthly_charges(self):
        job = BulkJob.objects.create(
            operation_type=BulkOperationType.ISSUE_MONTHLY_CHARGES,
            building=self.building,
            month="2026-02",
            requested_by=self.user,
            idempotency_key="test-bulk-dry-run-1",
        )

        build_dry_run(job)

        job.refresh_from_db()
        item = job.items.get()

        self.assertEqual(job.status, BulkJobStatus.PREVIEWED)
        self.assertTrue(job.dry_run_completed)
        self.assertEqual(item.status, BulkJobItemStatus.VALIDATED)
        self.assertGreater(item.amount, Decimal("0.00"))

    def test_execute_creates_management_fee_income_entries(self):
        job = BulkJob.objects.create(
            operation_type=BulkOperationType.CREATE_MANAGEMENT_FEE_INCOMES,
            building=self.building,
            month="2026-02",
            requested_by=self.user,
            idempotency_key="test-bulk-execute-1",
        )

        build_dry_run(job)
        execute_job(job)

        job.refresh_from_db()
        item = job.items.get()

        self.assertIn(job.status, [BulkJobStatus.COMPLETED, BulkJobStatus.PARTIAL])
        self.assertEqual(item.status, BulkJobItemStatus.EXECUTED)
        self.assertEqual(OfficeIncome.objects.count(), 1)
        income = OfficeIncome.objects.first()
        self.assertEqual(income.building_id, self.building.id)
        self.assertEqual(income.amount, Decimal("120.00"))

    def test_queue_execute_job_sets_running_state_and_task_id(self):
        job = BulkJob.objects.create(
            operation_type=BulkOperationType.CREATE_MANAGEMENT_FEE_INCOMES,
            building=self.building,
            month="2026-02",
            requested_by=self.user,
            idempotency_key="test-bulk-queue-1",
        )
        build_dry_run(job)

        with patch("office_ops.tasks.process_bulk_job_task.delay") as mocked_delay:
            mocked_delay.return_value.id = "task-bulk-123"
            task_id = queue_job_execution(
                job,
                schema_name=connection.schema_name,
                mode="execute",
            )

        job.refresh_from_db()
        queue_meta = (job.summary or {}).get("queue", {})

        self.assertEqual(task_id, "task-bulk-123")
        self.assertEqual(job.status, BulkJobStatus.RUNNING)
        self.assertEqual(queue_meta.get("task_id"), "task-bulk-123")
        self.assertEqual(queue_meta.get("mode"), "execute")

    def test_execute_job_without_validated_items_finalizes_cleanly(self):
        job = BulkJob.objects.create(
            operation_type=BulkOperationType.CREATE_MANAGEMENT_FEE_INCOMES,
            building=self.building,
            month="2026-02",
            requested_by=self.user,
            idempotency_key="test-bulk-no-validated-1",
        )
        self.building.management_fee_per_apartment = Decimal("0.00")
        self.building.save(update_fields=["management_fee_per_apartment"])

        build_dry_run(job)
        job.status = BulkJobStatus.RUNNING
        job.save(update_fields=["status", "updated_at"])

        execute_job(job)
        job.refresh_from_db()

        execution_summary = (job.summary or {}).get("execution", {})
        self.assertEqual(job.status, BulkJobStatus.COMPLETED)
        self.assertEqual(execution_summary.get("executed"), 0)
        self.assertEqual(execution_summary.get("failed"), 0)
