"""
DRF Serializers for notifications app.
"""
from rest_framework import serializers
from .models import (
    NotificationTemplate,
    Notification,
    NotificationRecipient,
    MonthlyNotificationTask,
    NotificationEvent,
    UserDeviceToken,
    UserViberSubscription,
    NotificationPreference,
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
            'attachment',
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

    building_id = serializers.IntegerField(
        help_text="ID του κτιρίου στο οποίο θα σταλεί η ειδοποίηση"
    )
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

        # Context is optional when using template (will use empty dict if not provided)
        # The template rendering system will handle missing placeholders gracefully
        if has_template and 'context' not in data:
            data['context'] = {}

        # At least one recipient selection method
        has_specific = data.get('apartment_ids')
        has_all = data.get('send_to_all')

        if not has_specific and not has_all:
            raise serializers.ValidationError(
                "Either provide apartment_ids or set send_to_all=true"
            )

        if not data.get('building_id'):
            raise serializers.ValidationError("building_id is required")

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
    """Serializer for recurring notification tasks."""

    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recurrence_type_display = serializers.CharField(source='get_recurrence_type_display', read_only=True)
    day_of_week_display = serializers.SerializerMethodField()
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
            # Recurrence fields
            'recurrence_type',
            'recurrence_type_display',
            'day_of_week',
            'day_of_week_display',
            'day_of_month',
            'time_to_send',
            'last_sent_at',
            'next_scheduled_at',
            # Settings
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
            'last_sent_at',
            'next_scheduled_at',
        ]

    def get_day_of_week_display(self, obj):
        """Get human-readable day of week."""
        if obj.day_of_week is not None:
            days = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή']
            return days[obj.day_of_week] if 0 <= obj.day_of_week <= 6 else None
        return None


class MonthlyTaskConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a monthly task."""

    send_immediately = serializers.BooleanField(default=True)
    enable_auto_send = serializers.BooleanField(
        default=False,
        help_text="Enable automatic sending for future months"
    )


class NotificationEventSerializer(serializers.ModelSerializer):
    """Serializer for notification events."""

    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    icon = serializers.SerializerMethodField()
    is_pending = serializers.BooleanField(read_only=True)

    class Meta:
        model = NotificationEvent
        fields = [
            'id',
            'event_type',
            'event_type_display',
            'building',
            'title',
            'description',
            'url',
            'icon',
            'created_at',
            'event_date',
            'included_in_digest',
            'digest_sent_at',
            'sent_immediately',
            'immediate_notification',
            'is_urgent',
            'is_pending',
            'related_announcement_id',
            'related_vote_id',
            'related_maintenance_id',
            'related_project_id',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'event_type_display',
            'icon',
            'is_pending',
            'included_in_digest',
            'digest_sent_at',
            'sent_immediately',
            'immediate_notification',
        ]

    def get_icon(self, obj):
        """Get icon/emoji for event."""
        return obj.get_icon()


class DigestPreviewSerializer(serializers.Serializer):
    """Serializer for digest preview request."""

    since_date = serializers.DateTimeField(
        required=False,
        help_text="Include events since this date (default: last 24 hours)"
    )
    building_id = serializers.IntegerField(
        required=False,
        help_text="Building ID (defaults to current building)"
    )


class SendDigestSerializer(serializers.Serializer):
    """Serializer for sending digest email."""

    since_date = serializers.DateTimeField(
        required=False,
        help_text="Include events since this date (default: last 24 hours)"
    )
    building_id = serializers.IntegerField(
        required=False,
        help_text="Building ID (defaults to current building)"
    )


class MonthlyTaskConfigureSerializer(serializers.Serializer):
    """Serializer for configuring recurring notification tasks."""

    task_type = serializers.ChoiceField(
        choices=['common_expense', 'balance_reminder', 'custom'],
        help_text="Type of task"
    )
    building = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Building ID (null = applies to all buildings)"
    )
    
    # Recurrence settings
    recurrence_type = serializers.ChoiceField(
        choices=['once', 'weekly', 'biweekly', 'monthly'],
        default='monthly',
        help_text="How often to repeat: once, weekly, biweekly, monthly"
    )
    day_of_week = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=6,
        help_text="Day of week for weekly/biweekly (0=Monday, 6=Sunday)"
    )
    day_of_month = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=31,
        help_text="Day of month to send (1-31) - for monthly tasks"
    )
    time_to_send = serializers.TimeField(
        help_text="Time to send notification (HH:MM format)"
    )
    template = serializers.IntegerField(
        required=False,
        default=0,
        help_text="NotificationTemplate ID (0 or omit to auto-select based on task_type)"
    )
    auto_send_enabled = serializers.BooleanField(
        default=False,
        help_text="Enable automatic sending without confirmation"
    )
    period_month = serializers.DateField(
        required=False,
        help_text="Period month (YYYY-MM-DD format, defaults to next month)"
    )

    def validate(self, data):
        """Validate recurrence settings."""
        recurrence_type = data.get('recurrence_type', 'monthly')
        
        if recurrence_type in ['weekly', 'biweekly']:
            if data.get('day_of_week') is None:
                raise serializers.ValidationError({
                    'day_of_week': 'Απαιτείται επιλογή ημέρας εβδομάδας για εβδομαδιαίες ειδοποιήσεις'
                })
        elif recurrence_type == 'monthly':
            if data.get('day_of_month') is None:
                data['day_of_month'] = 1  # Default to 1st of month
        
        return data


class MonthlyTaskPreviewSerializer(serializers.Serializer):
    """Serializer for previewing monthly task notifications."""

    context = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        help_text="Additional context variables for template rendering"
    )


class MonthlyTaskTestSendSerializer(serializers.Serializer):
    """Serializer for test sending monthly task notifications."""

    test_email = serializers.EmailField(
        help_text="Email address to send test notification to"
    )


class UserDeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer for user device tokens (push notifications)."""

    class Meta:
        model = UserDeviceToken
        fields = [
            'id',
            'token',
            'platform',
            'device_name',
            'is_active',
            'created_at',
            'updated_at',
            'last_used_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used_at']
    
    def create(self, validated_data):
        """Create or update device token."""
        user = self.context['request'].user
        token = validated_data.get('token')
        
        # Update existing or create new
        device, created = UserDeviceToken.objects.update_or_create(
            token=token,
            defaults={
                'user': user,
                'platform': validated_data.get('platform', 'android'),
                'device_name': validated_data.get('device_name', ''),
                'is_active': True,
            }
        )
        return device


class UserViberSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Viber subscriptions."""

    class Meta:
        model = UserViberSubscription
        fields = [
            'id',
            'viber_user_id',
            'viber_name',
            'viber_avatar',
            'is_subscribed',
            'subscribed_at',
            'unsubscribed_at',
            'last_message_at',
        ]
        read_only_fields = [
            'id',
            'viber_user_id',
            'viber_name',
            'viber_avatar',
            'subscribed_at',
            'unsubscribed_at',
            'last_message_at',
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences."""
    
    building_name = serializers.CharField(source='building.name', read_only=True, allow_null=True)
    enabled_channels = serializers.SerializerMethodField()

    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'user',
            'building',
            'building_name',
            'category',
            'email_enabled',
            'sms_enabled',
            'viber_enabled',
            'push_enabled',
            'instant_notifications',
            'digest_only',
            'quiet_hours_start',
            'quiet_hours_end',
            'enabled_channels',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'building_name', 'enabled_channels']
    
    def get_enabled_channels(self, obj):
        """Get list of enabled channel names."""
        return obj.get_enabled_channels()
    
    def create(self, validated_data):
        """Create preference for current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationPreferenceUpdateSerializer(serializers.Serializer):
    """Serializer for batch updating notification preferences."""
    
    category = serializers.CharField(default='all')
    building_id = serializers.IntegerField(required=False, allow_null=True)
    email_enabled = serializers.BooleanField(required=False)
    sms_enabled = serializers.BooleanField(required=False)
    viber_enabled = serializers.BooleanField(required=False)
    push_enabled = serializers.BooleanField(required=False)
    instant_notifications = serializers.BooleanField(required=False)
    digest_only = serializers.BooleanField(required=False)
    quiet_hours_start = serializers.TimeField(required=False, allow_null=True)
    quiet_hours_end = serializers.TimeField(required=False, allow_null=True)


class ChannelStatusSerializer(serializers.Serializer):
    """Serializer for channel status information."""
    
    channel = serializers.CharField()
    enabled = serializers.BooleanField()
    priority = serializers.IntegerField()
    healthy = serializers.BooleanField()
    status = serializers.CharField()
    provider = serializers.CharField(required=False)


class MultiChannelNotificationSerializer(serializers.Serializer):
    """Serializer for multi-channel notification sending."""
    
    building_id = serializers.IntegerField(
        help_text="ID του κτιρίου"
    )
    
    # Content
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField()
    sms_message = serializers.CharField(required=False, allow_blank=True)
    push_title = serializers.CharField(max_length=100, required=False)
    push_data = serializers.DictField(required=False, default=dict)
    
    # Channels
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=['email', 'sms', 'viber', 'push']),
        default=['email'],
        help_text="Κανάλια αποστολής"
    )
    
    # Recipients
    apartment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    send_to_all = serializers.BooleanField(default=False)
    
    # Options
    priority = serializers.ChoiceField(
        choices=['low', 'normal', 'high', 'urgent'],
        default='normal'
    )
    use_fallbacks = serializers.BooleanField(
        default=True,
        help_text="Χρήση fallback καναλιών αν αποτύχει το πρωτεύον"
    )
    respect_preferences = serializers.BooleanField(
        default=True,
        help_text="Σεβασμός προτιμήσεων χρηστών"
    )
    
    def validate(self, data):
        """Validate the request."""
        if not data.get('apartment_ids') and not data.get('send_to_all'):
            raise serializers.ValidationError(
                "Πρέπει να δώσετε apartment_ids ή send_to_all=true"
            )
        return data
