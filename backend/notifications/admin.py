"""
Django admin configuration for notifications app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import NotificationTemplate, Notification, NotificationRecipient, EmailBatch, EmailBatchRecipient


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    """Admin interface for notification templates."""

    list_display = [
        'name',
        'category',
        'building',
        'is_active',
        'is_system',
        'created_at',
    ]
    list_filter = [
        'category',
        'is_active',
        'is_system',
        'building',
    ]
    search_fields = [
        'name',
        'subject',
        'body_template',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': (
                'name',
                'category',
                'description',
                'building',
            )
        }),
        ('Email Content', {
            'fields': (
                'subject',
                'body_template',
            )
        }),
        ('SMS Content (Optional)', {
            'fields': (
                'sms_template',
            ),
            'classes': ('collapse',),
        }),
        ('Settings', {
            'fields': (
                'is_active',
                'is_system',
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of system templates."""
        if obj and obj.is_system:
            return False
        return super().has_delete_permission(request, obj)


class NotificationRecipientInline(admin.TabularInline):
    """Inline admin for notification recipients."""

    model = NotificationRecipient
    extra = 0
    readonly_fields = [
        'apartment',
        'status',
        'email',
        'phone',
        'sent_at',
        'error_message',
    ]
    fields = [
        'apartment',
        'status',
        'email',
        'phone',
        'sent_at',
        'error_message',
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for notifications."""

    list_display = [
        'subject',
        'building',
        'notification_type',
        'status_badge',
        'delivery_stats',
        'created_by',
        'created_at',
    ]
    list_filter = [
        'status',
        'notification_type',
        'priority',
        'building',
        'created_at',
    ]
    search_fields = [
        'subject',
        'body',
    ]
    readonly_fields = [
        'created_at',
        'sent_at',
        'completed_at',
        'delivery_rate_display',
    ]
    inlines = [NotificationRecipientInline]

    fieldsets = (
        ('Βασικές Πληροφορίες', {
            'fields': (
                'building',
                'template',
                'created_by',
            )
        }),
        ('Content', {
            'fields': (
                'subject',
                'body',
                'sms_body',
            )
        }),
        ('Settings', {
            'fields': (
                'notification_type',
                'priority',
                'status',
                'scheduled_at',
            )
        }),
        ('Statistics', {
            'fields': (
                'total_recipients',
                'successful_sends',
                'failed_sends',
                'delivery_rate_display',
            ),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'sent_at',
                'completed_at',
            ),
            'classes': ('collapse',),
        }),
        ('Error Info', {
            'fields': (
                'error_message',
            ),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'draft': 'gray',
            'scheduled': 'blue',
            'sending': 'orange',
            'sent': 'green',
            'failed': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def delivery_stats(self, obj):
        """Display delivery statistics."""
        if obj.total_recipients == 0:
            return '-'
        return format_html(
            '✅ {} / ❌ {} / 📊 {:.1f}%',
            obj.successful_sends,
            obj.failed_sends,
            obj.delivery_rate
        )
    delivery_stats.short_description = 'Delivery'

    def delivery_rate_display(self, obj):
        """Display delivery rate percentage."""
        return f"{obj.delivery_rate:.1f}%"
    delivery_rate_display.short_description = 'Delivery Rate'


@admin.register(NotificationRecipient)
class NotificationRecipientAdmin(admin.ModelAdmin):
    """Admin interface for notification recipients."""

    list_display = [
        'notification',
        'apartment',
        'status_badge',
        'email',
        'phone',
        'sent_at',
    ]
    list_filter = [
        'status',
        'notification__building',
        'sent_at',
    ]
    search_fields = [
        'notification__subject',
        'apartment__number',
        'email',
        'phone',
    ]
    readonly_fields = [
        'notification',
        'apartment',
        'created_at',
        'sent_at',
        'delivered_at',
        'opened_at',
        'clicked_at',
    ]

    fieldsets = (
        ('Notification Info', {
            'fields': (
                'notification',
                'apartment',
            )
        }),
        ('Contact Info', {
            'fields': (
                'recipient_name',
                'email',
                'phone',
            )
        }),
        ('Delivery Status', {
            'fields': (
                'status',
                'error_message',
                'retry_count',
                'provider_message_id',
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'sent_at',
                'delivered_at',
            ),
        }),
        ('Engagement Tracking', {
            'fields': (
                'opened_at',
                'clicked_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'pending': 'gray',
            'sending': 'orange',
            'sent': 'blue',
            'delivered': 'green',
            'failed': 'red',
            'bounced': 'darkred',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'


class EmailBatchRecipientInline(admin.TabularInline):
    model = EmailBatchRecipient
    extra = 0
    readonly_fields = [
        'apartment',
        'email',
        'status',
        'provider_message_id',
        'provider_request_id',
        'sent_at',
        'finalized_at',
        'error_message',
        'created_at',
    ]
    fields = [
        'apartment',
        'email',
        'status',
        'provider_message_id',
        'provider_request_id',
        'sent_at',
        'finalized_at',
        'error_message',
        'created_at',
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EmailBatch)
class EmailBatchAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'purpose',
        'building',
        'subject',
        'created_by',
        'created_at',
    ]
    list_filter = [
        'purpose',
        'building',
    ]
    search_fields = [
        'subject',
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
    ]
    inlines = [EmailBatchRecipientInline]
