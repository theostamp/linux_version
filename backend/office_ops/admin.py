from django.contrib import admin

from .models import BulkJob, BulkJobError, BulkJobItem, BulkTemplate


@admin.register(BulkTemplate)
class BulkTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "operation_type",
        "is_active",
        "is_system",
        "created_at",
    )
    list_filter = ("operation_type", "is_active", "is_system")
    search_fields = ("name",)
    ordering = ("operation_type", "name")


@admin.register(BulkJob)
class BulkJobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "operation_type",
        "status",
        "building",
        "month",
        "dry_run_completed",
        "created_at",
        "finished_at",
    )
    list_filter = ("operation_type", "status", "dry_run_completed")
    search_fields = ("idempotency_key",)
    readonly_fields = ("created_at", "updated_at", "started_at", "finished_at")
    ordering = ("-created_at",)


@admin.register(BulkJobItem)
class BulkJobItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "job",
        "building",
        "entity_type",
        "entity_id",
        "status",
        "amount",
        "retry_count",
        "executed_at",
    )
    list_filter = ("status", "entity_type")
    search_fields = ("entity_id", "job__idempotency_key")
    readonly_fields = ("created_at", "updated_at", "executed_at")
    ordering = ("-created_at",)


@admin.register(BulkJobError)
class BulkJobErrorAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "item", "error_code", "created_at")
    list_filter = ("error_code",)
    search_fields = ("message", "job__idempotency_key")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
