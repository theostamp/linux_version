"""
Notifications models for email and SMS notifications.
"""
from django.db import models
from django.utils import timezone
from buildings.models import Building
from apartments.models import Apartment
from users.models import CustomUser
from dateutil.relativedelta import relativedelta


class NotificationTemplate(models.Model):
    """
    Reusable notification templates with variable placeholders.
    """

    CATEGORY_CHOICES = [
        ('announcement', 'Ανακοίνωση'),
        ('payment', 'Πληρωμή'),
        ('maintenance', 'Συντήρηση'),
        ('meeting', 'Συνέλευση'),
        ('emergency', 'Έκτακτο'),
        ('reminder', 'Υπενθύμιση'),
    ]

    # Basic info
    name = models.CharField(
        max_length=200,
        help_text="Template name (e.g., 'Υπενθύμιση Οφειλών')"
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        db_index=True
    )
    description = models.TextField(
        blank=True,
        help_text="Template description for internal use"
    )

    # Email content
    subject = models.CharField(
        max_length=200,
        help_text="Email subject line with {{placeholders}}"
    )
    body_template = models.TextField(
        help_text="Email body with {{placeholders}}"
    )

    # SMS content (optional)
    sms_template = models.TextField(
        blank=True,
        help_text="Shorter SMS version (160 chars recommended)"
    )

    # Metadata
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(
        default=False,
        help_text="System templates cannot be deleted"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Multi-tenant
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='notification_templates'
    )

    class Meta:
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['building', 'category']),
            models.Index(fields=['building', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

    def get_available_variables(self):
        """
        Extract all placeholder variables from template.
        Returns list of variable names (without {{ }})
        """
        import re
        text = f"{self.subject} {self.body_template} {self.sms_template}"
        pattern = r'\{\{(\w+)\}\}'
        variables = list(set(re.findall(pattern, text)))
        return sorted(variables)

    def render(self, context):
        """
        Render template with provided context variables.

        Args:
            context: Dict of {placeholder: value} pairs

        Returns:
            Dict with 'subject', 'body', 'sms' keys
        """
        subject = self.subject
        body = self.body_template
        sms = self.sms_template

        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
            if sms:
                sms = sms.replace(placeholder, str(value))

        return {
            'subject': subject,
            'body': body,
            'sms': sms
        }


class Notification(models.Model):
    """
    Individual notification sent to multiple recipients.
    """

    TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('both', 'Email & SMS'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Χαμηλή'),
        ('normal', 'Κανονική'),
        ('high', 'Υψηλή'),
        ('urgent', 'Επείγουσα'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Πρόχειρο'),
        ('scheduled', 'Προγραμματισμένο'),
        ('sending', 'Αποστολή'),
        ('sent', 'Στάλθηκε'),
        ('failed', 'Αποτυχία'),
    ]

    # Basic info
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    template = models.ForeignKey(
        NotificationTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Template used (optional)"
    )

    # Content
    subject = models.CharField(max_length=200)
    body = models.TextField(help_text="Rendered email body")
    sms_body = models.TextField(
        blank=True,
        help_text="Rendered SMS body (if applicable)"
    )
    attachment = models.FileField(
        upload_to='notifications/attachments/%Y/%m/',
        null=True,
        blank=True,
        help_text="Optional attachment (e.g., common expenses sheet PDF/JPG)"
    )

    # Metadata
    notification_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        default='email'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='normal'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True
    )

    # Sending info
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Send at specific time (null = send immediately)"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Statistics
    total_recipients = models.IntegerField(default=0)
    successful_sends = models.IntegerField(default=0)
    failed_sends = models.IntegerField(default=0)

    # Error tracking
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['building', '-created_at']),
            models.Index(fields=['building', 'status']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"{self.subject} - {self.created_at.strftime('%d/%m/%Y')}"

    @property
    def delivery_rate(self):
        """Calculate delivery success rate as percentage."""
        if self.total_recipients == 0:
            return 0
        return (self.successful_sends / self.total_recipients) * 100

    def mark_as_sending(self):
        """Mark notification as currently sending."""
        self.status = 'sending'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    def mark_as_sent(self):
        """Mark notification as successfully sent."""
        self.status = 'sent'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])

    def mark_as_failed(self, error_message=''):
        """Mark notification as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])

    def update_statistics(self):
        """Update send statistics from recipients."""
        stats = self.recipients.aggregate(
            total=models.Count('id'),
            successful=models.Count('id', filter=models.Q(
                status__in=['sent', 'delivered']
            )),
            failed=models.Count('id', filter=models.Q(
                status__in=['failed', 'bounced']
            ))
        )

        self.total_recipients = stats['total']
        self.successful_sends = stats['successful']
        self.failed_sends = stats['failed']
        self.save(update_fields=['total_recipients', 'successful_sends', 'failed_sends'])


class MonthlyNotificationTask(models.Model):
    """
    Tracks monthly recurring notification tasks (e.g., common expense bills).
    Supports both manual confirmation and automatic sending.
    """

    TASK_TYPE_CHOICES = [
        ('common_expense', 'Λογαριασμός Κοινοχρήστων'),
        ('balance_reminder', 'Υπενθύμιση Οφειλών'),
        ('custom', 'Προσαρμοσμένη'),
    ]

    STATUS_CHOICES = [
        ('pending_confirmation', 'Αναμονή Επιβεβαίωσης'),
        ('confirmed', 'Επιβεβαιωμένη'),
        ('sent', 'Απεσταλμένη'),
        ('skipped', 'Παραλήφθηκε'),
        ('auto_sent', 'Απεστάλη Αυτόματα'),
    ]

    # Task configuration
    task_type = models.CharField(
        max_length=50,
        choices=TASK_TYPE_CHOICES,
        default='common_expense'
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='monthly_tasks',
        null=True,
        blank=True,
        help_text="Null = applies to all buildings"
    )
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Scheduling
    day_of_month = models.IntegerField(
        default=1,
        help_text="Day of month to trigger (1-31)"
    )
    time_to_send = models.TimeField(
        default='09:00',
        help_text="Time to send notification"
    )

    # Automation settings
    auto_send_enabled = models.BooleanField(
        default=False,
        help_text="If True, send automatically without confirmation"
    )

    # Period tracking
    period_month = models.DateField(
        help_text="Month this task is for (YYYY-MM-01)"
    )

    # Status
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending_confirmation',
        db_index=True
    )

    # Related notification (after sending)
    notification = models.ForeignKey(
        'Notification',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='monthly_task'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    # User who confirmed (if manual)
    confirmed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['-period_month', '-created_at']
        indexes = [
            models.Index(fields=['period_month', 'status']),
            models.Index(fields=['building', 'period_month']),
        ]
        unique_together = [
            ('building', 'task_type', 'period_month'),
        ]

    def __str__(self):
        building_name = self.building.name if self.building else "Όλα τα κτίρια"
        return f"{self.get_task_type_display()} - {building_name} - {self.period_month.strftime('%m/%Y')}"

    @property
    def is_due(self):
        """Check if task is due to be sent."""
        now = timezone.now()
        target_date = self.period_month.replace(day=self.day_of_month)
        target_datetime = timezone.make_aware(
            timezone.datetime.combine(target_date, self.time_to_send)
        )
        return now >= target_datetime

    @property
    def can_auto_send(self):
        """Check if task can be sent automatically."""
        return (
            self.auto_send_enabled
            and self.status == 'pending_confirmation'
            and self.is_due
        )


class NotificationRecipient(models.Model):
    """
    Individual recipient tracking for each notification.
    """

    STATUS_CHOICES = [
        ('pending', 'Εκκρεμεί'),
        ('sending', 'Αποστέλλεται'),
        ('sent', 'Στάλθηκε'),
        ('delivered', 'Παραδόθηκε'),
        ('failed', 'Αποτυχία'),
        ('bounced', 'Επιστράφηκε'),
    ]

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='recipients'
    )
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.CASCADE,
        related_name='notification_receipts'
    )

    # Contact info snapshot (at send time)
    recipient_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Delivery status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)

    # Engagement tracking (optional)
    opened_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Email open tracking"
    )
    clicked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Link click tracking"
    )

    # External provider info
    provider_message_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="External provider's message ID (for tracking)"
    )

    class Meta:
        ordering = ['apartment__number']
        indexes = [
            models.Index(fields=['notification', 'status']),
            models.Index(fields=['apartment', '-created_at']),
        ]
        unique_together = ['notification', 'apartment']

    def __str__(self):
        return f"{self.apartment.number} - {self.get_status_display()}"

    def mark_as_sent(self, provider_message_id=''):
        """Mark as successfully sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.provider_message_id = provider_message_id
        self.save(update_fields=['status', 'sent_at', 'provider_message_id'])

    def mark_as_delivered(self):
        """Mark as delivered (from provider webhook)."""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save(update_fields=['status', 'delivered_at'])

    def mark_as_failed(self, error_message=''):
        """Mark as failed with error message."""
        self.status = 'failed'
        self.error_message = error_message
        self.retry_count += 1
        self.save(update_fields=['status', 'error_message', 'retry_count'])

    def mark_as_opened(self):
        """Mark email as opened."""
        if not self.opened_at:
            self.opened_at = timezone.now()
            self.save(update_fields=['opened_at'])

    def mark_as_clicked(self):
        """Mark email link as clicked."""
        if not self.clicked_at:
            self.clicked_at = timezone.now()
            self.save(update_fields=['clicked_at'])
