from typing import Any

from rest_framework import serializers

from .models import (
    TodoCategory,
    TodoItem,
    TodoTemplate,
    TodoNotification,
)


class TodoCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoCategory
        fields = [
            "id",
            "name",
            "icon",
            "color",
            "building",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TodoItemSerializer(serializers.ModelSerializer):
    is_overdue = serializers.ReadOnlyField()
    is_due_soon = serializers.ReadOnlyField()
    priority_score = serializers.ReadOnlyField()

    class Meta:
        model = TodoItem
        fields = [
            "id",
            "title",
            "description",
            "category",
            "building",
            "apartment",
            "priority",
            "status",
            "due_date",
            "completed_at",
            "created_by",
            "assigned_to",
            "estimated_hours",
            "actual_hours",
            "tags",
            "attachments",
            "created_at",
            "updated_at",
            # Computed
            "is_overdue",
            "is_due_soon",
            "priority_score",
        ]


class TodoTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoTemplate
        fields = [
            "id",
            "title",
            "description",
            "category",
            "building",
            "frequency",
            "custom_days",
            "auto_create",
            "last_created",
            "priority",
            "estimated_hours",
            "is_active",
            "created_at",
            "updated_at",
        ]


class TodoNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoNotification
        fields = [
            "id",
            "todo",
            "user",
            "notification_type",
            "message",
            "is_read",
            "read_at",
            "created_at",
        ]

