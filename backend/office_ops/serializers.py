from __future__ import annotations

from django.db.models import Count
from rest_framework import serializers

from .models import (
    BulkJob,
    BulkJobError,
    BulkJobItem,
    BulkOperationType,
    BulkTemplate,
)


class BulkTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BulkTemplate
        fields = [
            "id",
            "name",
            "operation_type",
            "is_active",
            "is_system",
            "default_month_offset",
            "config",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_by", "created_at", "updated_at"]


class BulkJobItemSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source="building.name", read_only=True)

    class Meta:
        model = BulkJobItem
        fields = [
            "id",
            "job",
            "building",
            "building_name",
            "entity_type",
            "entity_id",
            "status",
            "amount",
            "currency",
            "payload",
            "validation_errors",
            "result",
            "retry_count",
            "executed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BulkJobErrorSerializer(serializers.ModelSerializer):
    class Meta:
        model = BulkJobError
        fields = ["id", "job", "item", "error_code", "message", "details", "created_at"]
        read_only_fields = fields


class BulkJobSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source="building.name", read_only=True)
    source_template_name = serializers.CharField(source="source_template.name", read_only=True)

    items = BulkJobItemSerializer(many=True, read_only=True)
    errors = BulkJobErrorSerializer(many=True, read_only=True)

    counts = serializers.SerializerMethodField()

    class Meta:
        model = BulkJob
        fields = [
            "id",
            "operation_type",
            "status",
            "building",
            "building_name",
            "month",
            "dry_run_completed",
            "options",
            "summary",
            "idempotency_key",
            "source_template",
            "source_template_name",
            "requested_by",
            "started_at",
            "finished_at",
            "created_at",
            "updated_at",
            "counts",
            "items",
            "errors",
        ]
        read_only_fields = fields

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.context.get("include_details", False):
            self.fields.pop("items", None)
            self.fields.pop("errors", None)

    def get_counts(self, obj):
        if hasattr(obj, "total_items_count"):
            return {
                "total_items": int(getattr(obj, "total_items_count") or 0),
                "validated": int(getattr(obj, "validated_items_count") or 0),
                "executed": int(getattr(obj, "executed_items_count") or 0),
                "failed": int(getattr(obj, "failed_items_count") or 0),
                "skipped": int(getattr(obj, "skipped_items_count") or 0),
            }

        aggregated = {
            "total_items": 0,
            "validated": 0,
            "executed": 0,
            "failed": 0,
            "skipped": 0,
        }
        status_counts = {
            row["status"]: row["total"]
            for row in obj.items.values("status").annotate(total=Count("id"))
        }
        aggregated["total_items"] = sum(status_counts.values())
        aggregated["validated"] = int(status_counts.get("validated", 0))
        aggregated["executed"] = int(status_counts.get("executed", 0))
        aggregated["failed"] = int(status_counts.get("failed", 0))
        aggregated["skipped"] = int(status_counts.get("skipped", 0))
        return aggregated


class BulkJobCreateSerializer(serializers.Serializer):
    operation_type = serializers.ChoiceField(choices=BulkOperationType.choices)
    building_id = serializers.IntegerField(required=False)
    month = serializers.RegexField(r"^\d{4}-\d{2}$", required=False, allow_blank=True)
    options = serializers.JSONField(required=False)

    template_id = serializers.PrimaryKeyRelatedField(
        queryset=BulkTemplate.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    auto_dry_run = serializers.BooleanField(required=False, default=True)
    idempotency_key = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate(self, attrs):
        template = attrs.get("template_id")
        operation_type = attrs.get("operation_type")

        if template and template.operation_type != operation_type:
            raise serializers.ValidationError(
                {"template_id": "Template operation type does not match selected operation."}
            )

        return attrs


class BulkRetrySerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=False,
    )
