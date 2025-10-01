"""
DRF Serializers for notifications app.
"""
from rest_framework import serializers
from .models import (
    NotificationTemplate,
    Notification,
    NotificationRecipient,
    MonthlyNotificationTask
)
from apartments.models import Apartment


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates."""

    category_display = serializers.CharField(source='get_category_display', read_only=True)
    available_variables = serializers.SerializerMethodField()

    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'category',
            'category_display',
            'description',
            'subject',
            'body_template',
            'sms_template',
            'is_active',
            'is_system',
            'building',
            'available_variables',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category_display', 'available_variables']

    def get_available_variables(self, obj):
        """Get list of placeholder variables from template."""
        return obj.get_available_variables()

    def validate_is_system(self, value):
        """Prevent marking templates as system via API."""
        if value and not self.instance:
            raise serializers.ValidationError(
                "Cannot create system templates via API"
            )
        return value


class NotificationTemplatePreviewSerializer(serializers.Serializer):
    """Serializer for previewing rendered templates."""

    template_id = serializers.IntegerField()
    context = serializers.DictField(
        child=serializers.CharField(),
        help_text="Dictionary of placeholder values"
    )

    rendered_subject = serializers.CharField(read_only=True)
    rendered_body = serializers.CharField(read_only=True)
    rendered_sms = serializers.CharField(read_only=True, allow_blank=True)


class NotificationRecipientSerializer(serializers.ModelSerializer):
    """Serializer for notification recipients."""

    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = NotificationRecipient
        fields = [
            'id',
            'notification',
            'apartment',
            'apartment_number',
            'recipient_name',
            'email',
            'phone',
            'status',
            'status_display',
            'created_at',
            'sent_at',
            'delivered_at',
            'error_message',
            'retry_count',
            'opened_at',
            'clicked_at',
            'provider_message_id',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'sent_at',
            'delivered_at',
            'opened_at',
            'clicked_at',
            'apartment_number',
            'status_display',
        ]


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""

    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    delivery_rate = serializers.FloatField(read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )

    # Nested recipients (optional, for detail view)
    recipients = NotificationRecipientSerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'building',
            'template',
            'subject',
            'body',
            'sms_body',
            'notification_type',
            'notification_type_display',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'created_by',
            'created_by_name',
            'created_at',
            'scheduled_at',
            'sent_at',
            'completed_at',
            'total_recipients',
            'successful_sends',
            'failed_sends',
            'delivery_rate',
            'error_message',
            'recipients',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'sent_at',
            'completed_at',
            'total_recipients',
            'successful_sends',
            'failed_sends',
            'delivery_rate',
            'error_message',
            'notification_type_display',
            'priority_display',
            'status_display',
            'created_by_name',
            'recipients',
        ]


class NotificationCreateSerializer(serializers.Serializer):
    """Serializer for creating and sending notifications."""

    # Template or manual content
    template_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=200, required=False)
    body = serializers.CharField(required=False)
    sms_body = serializers.CharField(required=False, allow_blank=True)

    # Template context (if using template)
    context = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        help_text="Placeholder values for template rendering"
    )

    # Recipients
    apartment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Specific apartment IDs (or empty for all apartments)"
    )
    send_to_all = serializers.BooleanField(default=False)

    # Settings
    notification_type = serializers.ChoiceField(
        choices=['email', 'sms', 'both'],
        default='email'
    )
    priority = serializers.ChoiceField(
        choices=['low', 'normal', 'high', 'urgent'],
        default='normal'
    )
    scheduled_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="Schedule for future sending (ISO format)"
    )

    def validate(self, data):
        """Validate notification creation data."""

        # Either template_id OR manual content must be provided
        has_template = data.get('template_id') is not None
        has_manual = data.get('subject') and data.get('body')

        if not has_template and not has_manual:
            raise serializers.ValidationError(
                "Either provide template_id with context, or subject and body"
            )

        # If using template, context is required
        if has_template and not data.get('context'):
            raise serializers.ValidationError(
                "Context is required when using template"
            )

        # At least one recipient selection method
        has_specific = data.get('apartment_ids')
        has_all = data.get('send_to_all')

        if not has_specific and not has_all:
            raise serializers.ValidationError(
                "Either provide apartment_ids or set send_to_all=true"
            )

        # SMS requires sms_body (or uses body as fallback)
        if data.get('notification_type') in ['sms', 'both']:
            if has_template:
                # Template should have sms_template
                pass  # Will be validated in view
            elif not data.get('sms_body') and not has_template:
                # Use body as fallback for SMS if sms_body not provided
                data['sms_body'] = data.get('body', '')

        return data


class NotificationStatisticsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""

    total_notifications = serializers.IntegerField()
    total_sent = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    total_recipients = serializers.IntegerField()
    average_delivery_rate = serializers.FloatField()

    by_type = serializers.DictField(child=serializers.IntegerField())
    by_status = serializers.DictField(child=serializers.IntegerField())
    recent_notifications = NotificationSerializer(many=True)


class MonthlyNotificationTaskSerializer(serializers.ModelSerializer):
    """Serializer for monthly notification tasks."""

    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    is_due = serializers.BooleanField(read_only=True)
    can_auto_send = serializers.BooleanField(read_only=True)

    class Meta:
        model = MonthlyNotificationTask
        fields = [
            'id',
            'task_type',
            'task_type_display',
            'building',
            'building_name',
            'template',
            'template_name',
            'day_of_month',
            'time_to_send',
            'auto_send_enabled',
            'period_month',
            'status',
            'status_display',
            'notification',
            'created_at',
            'confirmed_at',
            'sent_at',
            'confirmed_by',
            'is_due',
            'can_auto_send',
        ]
        read_only_fields = [
            'id',
            'notification',
            'created_at',
            'confirmed_at',
            'sent_at',
            'confirmed_by',
        ]


class MonthlyTaskConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a monthly task."""

    send_immediately = serializers.BooleanField(default=True)
    enable_auto_send = serializers.BooleanField(
        default=False,
        help_text="Enable automatic sending for future months"
    )
