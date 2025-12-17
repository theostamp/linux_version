from django.db import models


class WebhookProcessingStatus(models.TextChoices):
    OK = "ok", "OK"
    DUPLICATE = "duplicate", "Duplicate"
    FAILED = "failed", "Failed"


class WebhookEvent(models.Model):
    """
    Public-schema store for webhook idempotency and safe auditing.
    """

    provider = models.CharField(max_length=20, default="stripe")
    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    received_at = models.DateTimeField(auto_now_add=True)
    signature_valid = models.BooleanField(default=False)
    payload_json = models.JSONField()
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_status = models.CharField(
        max_length=20, choices=WebhookProcessingStatus.choices, default=WebhookProcessingStatus.OK
    )
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Webhook Event"
        verbose_name_plural = "Webhook Events"
        indexes = [
            models.Index(fields=["provider", "received_at"]),
            models.Index(fields=["processing_status"]),
        ]


