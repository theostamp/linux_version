from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class BulkOperationType(models.TextChoices):
    ISSUE_MONTHLY_CHARGES = "issue_monthly_charges", "Issue Monthly Charges"
    CREATE_MANAGEMENT_FEE_INCOMES = "create_management_fee_incomes", "Create Management Fee Incomes"
    EXPORT_DEBT_REPORT = "export_debt_report", "Export Debt Report"


class BulkJobStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PREVIEWED = "previewed", "Previewed"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    PARTIAL = "partial", "Partial"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class BulkJobItemStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    VALIDATED = "validated", "Validated"
    EXECUTED = "executed", "Executed"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"


class BulkTemplate(models.Model):
    name = models.CharField(max_length=120)
    operation_type = models.CharField(max_length=50, choices=BulkOperationType.choices)
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)

    default_month_offset = models.SmallIntegerField(default=0)
    config = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_bulk_templates",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["operation_type", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["operation_type", "name"],
                name="office_ops_template_unique_name_per_operation",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.operation_type})"


class BulkJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    operation_type = models.CharField(max_length=50, choices=BulkOperationType.choices)
    status = models.CharField(max_length=20, choices=BulkJobStatus.choices, default=BulkJobStatus.DRAFT)

    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="office_bulk_jobs",
        help_text="Optional building scope. If null, applies to all tenant buildings.",
    )
    month = models.CharField(max_length=7, blank=True, default="")

    dry_run_completed = models.BooleanField(default=False)
    options = models.JSONField(default=dict, blank=True)
    summary = models.JSONField(default=dict, blank=True)

    idempotency_key = models.CharField(max_length=120, unique=True, db_index=True)

    source_template = models.ForeignKey(
        BulkTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="requested_bulk_jobs",
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.operation_type} / {self.status} / {self.created_at:%Y-%m-%d %H:%M}"


class BulkJobItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(BulkJob, on_delete=models.CASCADE, related_name="items")
    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="office_bulk_job_items",
    )

    entity_type = models.CharField(max_length=40, default="building")
    entity_id = models.CharField(max_length=64)

    status = models.CharField(max_length=20, choices=BulkJobItemStatus.choices, default=BulkJobItemStatus.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="EUR")

    payload = models.JSONField(default=dict, blank=True)
    validation_errors = models.JSONField(default=list, blank=True)
    result = models.JSONField(default=dict, blank=True)

    retry_count = models.PositiveSmallIntegerField(default=0)
    executed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "entity_type", "entity_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["job", "entity_type", "entity_id"],
                name="office_ops_item_unique_per_job_entity",
            )
        ]

    def __str__(self) -> str:
        return f"{self.entity_type}:{self.entity_id} ({self.status})"


class BulkJobError(models.Model):
    job = models.ForeignKey(BulkJob, on_delete=models.CASCADE, related_name="errors")
    item = models.ForeignKey(
        BulkJobItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="errors",
    )

    error_code = models.CharField(max_length=80, blank=True, default="")
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.error_code or 'error'} / job={self.job_id}"
