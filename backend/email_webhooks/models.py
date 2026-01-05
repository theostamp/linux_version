from django.db import models


class EmailWebhookEvent(models.Model):
    provider = models.CharField(max_length=50, default="mailersend", db_index=True)
    event_id = models.CharField(max_length=200, blank=True, db_index=True)
    message_id = models.CharField(max_length=200, blank=True, db_index=True)
    email = models.EmailField(blank=True, db_index=True)
    event_type = models.CharField(max_length=50, blank=True, db_index=True)
    occurred_at = models.DateTimeField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    signature = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["provider", "event_type"]),
            models.Index(fields=["provider", "message_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.provider} {self.event_type} {self.email}".strip()
