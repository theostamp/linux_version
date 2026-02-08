from django.contrib import admin

from .models import DunningEvent, DunningPolicy, DunningRun, PromiseToPay


@admin.register(DunningPolicy)
class DunningPolicyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "building",
        "channel",
        "min_days_overdue",
        "max_days_overdue",
        "frequency_days",
        "is_active",
    )
    list_filter = ("is_active", "channel", "building")
    search_fields = ("name", "template_slug")
    ordering = ("building_id", "min_days_overdue", "escalation_level")


@admin.register(DunningRun)
class DunningRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "building",
        "policy",
        "source",
        "status",
        "month",
        "total_candidates",
        "total_sent",
        "total_failed",
        "total_skipped",
        "started_at",
    )
    list_filter = ("status", "source", "building", "policy")
    search_fields = ("idempotency_key",)
    readonly_fields = ("started_at", "updated_at")
    ordering = ("-started_at",)


@admin.register(DunningEvent)
class DunningEventAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "run",
        "apartment",
        "channel",
        "status",
        "days_overdue",
        "amount_due",
        "attempt_number",
        "created_at",
    )
    list_filter = ("status", "channel", "building")
    search_fields = ("recipient", "provider_message_id", "error_code")
    readonly_fields = ("trace_id", "created_at")
    ordering = ("-created_at",)


@admin.register(PromiseToPay)
class PromiseToPayAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "building",
        "apartment",
        "amount",
        "promised_date",
        "status",
        "kept_at",
        "created_at",
    )
    list_filter = ("status", "building")
    search_fields = ("apartment__number", "notes")
    ordering = ("promised_date", "-created_at")

