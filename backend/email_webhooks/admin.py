from django.contrib import admin

from .models import EmailWebhookEvent


@admin.register(EmailWebhookEvent)
class EmailWebhookEventAdmin(admin.ModelAdmin):
    list_display = ("provider", "event_type", "email", "message_id", "occurred_at", "received_at")
    list_filter = ("provider", "event_type")
    search_fields = ("email", "message_id", "event_id")
    readonly_fields = ("payload", "signature", "received_at", "occurred_at")
