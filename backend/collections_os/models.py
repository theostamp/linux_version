from decimal import Decimal
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q


class DunningChannel(models.TextChoices):
    EMAIL = "email", "Email"
    SMS = "sms", "SMS"
    PUSH = "push", "Push"
    VIBER = "viber", "Viber"


class DunningPolicy(models.Model):
    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.CASCADE,
        related_name="dunning_policies",
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    min_days_overdue = models.PositiveIntegerField(default=0)
    max_days_overdue = models.PositiveIntegerField(null=True, blank=True)

    channel = models.CharField(max_length=20, choices=DunningChannel.choices, default=DunningChannel.EMAIL)
    frequency_days = models.PositiveIntegerField(default=7)
    escalation_level = models.PositiveSmallIntegerField(default=1)
    max_attempts = models.PositiveSmallIntegerField(default=3)
    template_slug = models.CharField(max_length=120, blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_dunning_policies",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["building_id", "min_days_overdue", "escalation_level", "id"]
        constraints = [
            models.UniqueConstraint(fields=["building", "name"], name="collections_policy_unique_name_per_building"),
            models.CheckConstraint(
                condition=Q(max_days_overdue__isnull=True) | Q(max_days_overdue__gte=F("min_days_overdue")),
                name="collections_policy_max_days_gte_min_days",
            ),
        ]
        indexes = [
            models.Index(fields=["building", "is_active"]),
            models.Index(fields=["building", "channel"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.building_id})"


class DunningRunStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


class DunningRunSource(models.TextChoices):
    MANUAL = "manual", "Manual"
    SCHEDULED = "scheduled", "Scheduled"
    RETRY = "retry", "Retry"


class DunningRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.CASCADE,
        related_name="dunning_runs",
    )
    policy = models.ForeignKey(
        DunningPolicy,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    source = models.CharField(max_length=20, choices=DunningRunSource.choices, default=DunningRunSource.MANUAL)
    status = models.CharField(max_length=20, choices=DunningRunStatus.choices, default=DunningRunStatus.PENDING)
    month = models.CharField(max_length=7, blank=True, default="")

    idempotency_key = models.CharField(max_length=80, unique=True, db_index=True)

    total_candidates = models.PositiveIntegerField(default=0)
    total_sent = models.PositiveIntegerField(default=0)
    total_failed = models.PositiveIntegerField(default=0)
    total_skipped = models.PositiveIntegerField(default=0)

    metadata = models.JSONField(default=dict, blank=True)

    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="triggered_dunning_runs",
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["building", "status", "started_at"]),
            models.Index(fields=["policy", "month"]),
        ]

    def __str__(self):
        return f"{self.policy.name} / {self.status} / {self.started_at:%Y-%m-%d}"


class DunningEventStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"


class DunningEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(DunningRun, on_delete=models.CASCADE, related_name="events")
    policy = models.ForeignKey(DunningPolicy, on_delete=models.CASCADE, related_name="events")
    building = models.ForeignKey("buildings.Building", on_delete=models.CASCADE, related_name="dunning_events")
    apartment = models.ForeignKey("apartments.Apartment", on_delete=models.CASCADE, related_name="dunning_events")

    channel = models.CharField(max_length=20, choices=DunningChannel.choices)
    status = models.CharField(max_length=20, choices=DunningEventStatus.choices, default=DunningEventStatus.QUEUED)

    recipient = models.CharField(max_length=255, blank=True, default="")
    days_overdue = models.PositiveIntegerField(default=0)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    attempt_number = models.PositiveSmallIntegerField(default=1)
    provider_message_id = models.CharField(max_length=255, blank=True, default="")
    error_code = models.CharField(max_length=50, blank=True, default="")
    error_message = models.TextField(blank=True, default="")

    trace_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    payload = models.JSONField(default=dict, blank=True)

    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["run", "apartment", "channel"],
                name="collections_event_unique_per_run_apartment_channel",
            )
        ]
        indexes = [
            models.Index(fields=["building", "status", "channel"]),
            models.Index(fields=["apartment", "created_at"]),
        ]

    def __str__(self):
        return f"{self.apartment.number} / {self.channel} / {self.status}"


class PromiseToPayStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    KEPT = "kept", "Kept"
    BROKEN = "broken", "Broken"
    CANCELLED = "cancelled", "Cancelled"


class PromiseToPay(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(
        "buildings.Building",
        on_delete=models.CASCADE,
        related_name="promises_to_pay",
    )
    apartment = models.ForeignKey(
        "apartments.Apartment",
        on_delete=models.CASCADE,
        related_name="promises_to_pay",
    )
    resident_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="promises_to_pay",
        null=True,
        blank=True,
    )
    source_event = models.ForeignKey(
        DunningEvent,
        on_delete=models.SET_NULL,
        related_name="promises_to_pay",
        null=True,
        blank=True,
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    promised_date = models.DateField()
    status = models.CharField(max_length=20, choices=PromiseToPayStatus.choices, default=PromiseToPayStatus.ACTIVE)
    kept_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_promises_to_pay",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["promised_date", "-created_at"]
        indexes = [
            models.Index(fields=["building", "status", "promised_date"]),
            models.Index(fields=["apartment", "status"]),
        ]

    def __str__(self):
        return f"{self.apartment.number} / {self.amount} / {self.status}"
