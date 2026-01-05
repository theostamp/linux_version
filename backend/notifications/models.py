"""
Notifications models for email and SMS notifications.
"""
from django.db import models
from django.utils import timezone
import calendar
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
        import logging
        logger = logging.getLogger(__name__)

        subject = self.subject
        body = self.body_template
        sms = self.sms_template

        logger.info(f"🎨 [TEMPLATE RENDER] Template ID: {self.id}, Name: {self.name}")
        logger.info(f"🎨 [TEMPLATE RENDER] Context keys: {list(context.keys())}")

        for key, value in context.items():
            # Try both with and without spaces
            placeholder_with_spaces = f"{{{{ {key} }}}}"
            placeholder_without_spaces = f"{{{{{key}}}}}"

            logger.info(f"🎨 [TEMPLATE RENDER] Replacing '{key}' = '{value}'")

            # Replace both formats to handle templates with or without spaces
            subject = subject.replace(placeholder_with_spaces, str(value))
            subject = subject.replace(placeholder_without_spaces, str(value))

            body = body.replace(placeholder_with_spaces, str(value))
            body = body.replace(placeholder_without_spaces, str(value))

            if sms:
                sms = sms.replace(placeholder_with_spaces, str(value))
                sms = sms.replace(placeholder_without_spaces, str(value))

        logger.info(f"🎨 [TEMPLATE RENDER] Rendered subject: {subject[:100]}")
        logger.info(f"🎨 [TEMPLATE RENDER] Rendered body length: {len(body)} chars")

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
        ('viber', 'Viber'),
        ('push', 'Push Notification'),
        ('all', 'Όλα τα κανάλια'),
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
    Tracks recurring notification tasks (e.g., common expense bills, debt reminders).
    Supports both manual confirmation and automatic sending.
    Now supports multiple recurrence patterns: once, weekly, biweekly, monthly.
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

    RECURRENCE_CHOICES = [
        ('once', 'Μία Φορά'),
        ('weekly', 'Εβδομαδιαία'),
        ('biweekly', 'Κάθε 2 Εβδομάδες'),
        ('monthly', 'Μηνιαία'),
    ]

    DAY_OF_WEEK_CHOICES = [
        (0, 'Δευτέρα'),
        (1, 'Τρίτη'),
        (2, 'Τετάρτη'),
        (3, 'Πέμπτη'),
        (4, 'Παρασκευή'),
        (5, 'Σάββατο'),
        (6, 'Κυριακή'),
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

    # Recurrence settings
    recurrence_type = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default='monthly',
        help_text="How often to repeat: once, weekly, biweekly, monthly"
    )
    day_of_week = models.IntegerField(
        choices=DAY_OF_WEEK_CHOICES,
        null=True,
        blank=True,
        help_text="Day of week for weekly/biweekly tasks (0=Monday, 6=Sunday)"
    )

    # Scheduling
    day_of_month = models.IntegerField(
        default=1,
        null=True,
        blank=True,
        help_text="Day of month to trigger (1-31) - used for monthly tasks"
    )
    time_to_send = models.TimeField(
        default='09:00',
        help_text="Time to send notification"
    )

    # Recurrence tracking
    last_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this recurring task was executed"
    )
    next_scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Next scheduled execution time"
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

    def _resolve_month_day(self, year: int, month: int) -> int:
        last_day = calendar.monthrange(year, month)[1]
        target_day = self.day_of_month or last_day
        if target_day <= 0:
            target_day = last_day
        return min(target_day, last_day)

    @property
    def is_due(self):
        """Check if task is due to be sent."""
        now = timezone.now()
        target_day = self._resolve_month_day(self.period_month.year, self.period_month.month)
        target_date = self.period_month.replace(day=target_day)
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

    def calculate_next_scheduled_at(self, from_date=None):
        """
        Calculate the next scheduled execution time based on recurrence settings.

        Args:
            from_date: Starting date for calculation (defaults to now)

        Returns:
            datetime: Next scheduled execution time
        """
        from datetime import timedelta

        if from_date is None:
            from_date = timezone.now()

        # Combine date with time_to_send
        def make_scheduled_datetime(dt):
            return timezone.make_aware(
                timezone.datetime.combine(dt.date() if hasattr(dt, 'date') else dt, self.time_to_send)
            ) if timezone.is_naive(timezone.datetime.combine(dt.date() if hasattr(dt, 'date') else dt, self.time_to_send)) else timezone.datetime.combine(dt.date() if hasattr(dt, 'date') else dt, self.time_to_send)

        if self.recurrence_type == 'once':
            # One-time task - use period_month with day_of_month
            if self.day_of_month:
                target_day = self._resolve_month_day(self.period_month.year, self.period_month.month)
                target_date = self.period_month.replace(day=target_day)
            else:
                target_date = self.period_month
            return make_scheduled_datetime(target_date)

        elif self.recurrence_type == 'weekly':
            # Weekly - find next occurrence of day_of_week
            if self.day_of_week is not None:
                days_ahead = self.day_of_week - from_date.weekday()
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                next_date = from_date.date() + timedelta(days=days_ahead)
                return make_scheduled_datetime(next_date)
            return make_scheduled_datetime(from_date.date() + timedelta(days=7))

        elif self.recurrence_type == 'biweekly':
            # Every 2 weeks - schedule for next occurrence of day_of_week
            # If last_sent_at exists, add 14 days from that; otherwise use next occurrence
            if self.day_of_week is not None:
                if self.last_sent_at:
                    # Add exactly 14 days from last sent
                    next_date = self.last_sent_at.date() + timedelta(days=14)
                else:
                    # First time: find next occurrence of the target day
                    days_ahead = self.day_of_week - from_date.weekday()
                    if days_ahead < 0:  # Target day already passed this week
                        days_ahead += 7  # Go to next week
                    next_date = from_date.date() + timedelta(days=days_ahead)
                return make_scheduled_datetime(next_date)
            # No specific day set - just add 14 days
            base_date = self.last_sent_at.date() if self.last_sent_at else from_date.date()
            return make_scheduled_datetime(base_date + timedelta(days=14))

        elif self.recurrence_type == 'monthly':
            # Monthly - find next occurrence of day_of_month
            current_date = from_date.date() if hasattr(from_date, 'date') else from_date
            target_day = self.day_of_month or 1
            current_target = min(target_day, calendar.monthrange(current_date.year, current_date.month)[1])
            next_date = current_date.replace(day=current_target)

            if next_date <= current_date:
                if current_date.month == 12:
                    next_year = current_date.year + 1
                    next_month = 1
                else:
                    next_year = current_date.year
                    next_month = current_date.month + 1
                next_target = min(target_day, calendar.monthrange(next_year, next_month)[1])
                next_date = current_date.replace(year=next_year, month=next_month, day=next_target)

            return make_scheduled_datetime(next_date)

        # Fallback
        return make_scheduled_datetime(from_date)

    def update_next_scheduled(self):
        """Update the next_scheduled_at field based on current settings."""
        if self.recurrence_type != 'once':
            self.next_scheduled_at = self.calculate_next_scheduled_at()
        else:
            self.next_scheduled_at = None
        self.save(update_fields=['next_scheduled_at'])


class NotificationEvent(models.Model):
    """
    Tracks events that generate notifications (announcements, votes, maintenance, etc.).
    Events can be sent immediately or included in digest emails.
    """

    EVENT_TYPE_CHOICES = [
        ('announcement', 'Ανακοίνωση'),
        ('vote', 'Ψηφοφορία'),
        ('maintenance', 'Συντήρηση'),
        ('project', 'Έργο'),
        ('common_expense', 'Κοινόχρηστα'),
        ('urgent', 'Επείγουσα'),
        ('meeting', 'Συνέλευση'),
        ('general', 'Γενικό'),
    ]

    # Event metadata
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPE_CHOICES,
        db_index=True
    )
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='notification_events'
    )

    # Content
    title = models.CharField(
        max_length=255,
        help_text="Event title (e.g., 'Νέα Ανακοίνωση: Συντήρηση Ασανσέρ')"
    )
    description = models.TextField(
        help_text="Event description/summary"
    )
    url = models.CharField(
        max_length=500,
        blank=True,
        help_text="Link to event detail page (e.g., /announcements/123)"
    )

    # Icon/emoji for display
    icon = models.CharField(
        max_length=10,
        blank=True,
        help_text="Emoji or icon (e.g., 📢, 🗳️, 🔧)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    event_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the actual event occurs (e.g., meeting date)"
    )

    # Digest tracking
    included_in_digest = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Has this been included in a digest email?"
    )
    digest_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When digest containing this event was sent"
    )

    # Immediate notification tracking
    sent_immediately = models.BooleanField(
        default=False,
        help_text="Was this sent as immediate notification (urgent events)?"
    )
    immediate_notification = models.ForeignKey(
        'Notification',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_events'
    )

    # Priority (for urgent events)
    is_urgent = models.BooleanField(
        default=False,
        help_text="Send immediately, don't wait for digest"
    )

    # Related objects (optional, for reference)
    related_announcement_id = models.IntegerField(null=True, blank=True)
    related_vote_id = models.IntegerField(null=True, blank=True)
    related_maintenance_id = models.IntegerField(null=True, blank=True)
    related_project_id = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['building', '-created_at']),
            models.Index(fields=['building', 'included_in_digest']),
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['is_urgent', 'sent_immediately']),
        ]

    def __str__(self):
        return f"{self.get_event_type_display()}: {self.title}"

    @property
    def is_pending(self):
        """Check if event is pending (not sent in any form)."""
        return not self.included_in_digest and not self.sent_immediately

    def mark_as_sent_in_digest(self):
        """Mark event as included in digest."""
        self.included_in_digest = True
        self.digest_sent_at = timezone.now()
        self.save(update_fields=['included_in_digest', 'digest_sent_at'])

    def mark_as_sent_immediately(self, notification):
        """Mark event as sent immediately."""
        self.sent_immediately = True
        self.immediate_notification = notification
        self.save(update_fields=['sent_immediately', 'immediate_notification'])

    def get_icon(self):
        """Get icon/emoji for event type."""
        if self.icon:
            return self.icon

        # Default icons by type
        icon_map = {
            'announcement': '📢',
            'vote': '🗳️',
            'maintenance': '🔧',
            'project': '🏗️',
            'common_expense': '💰',
            'urgent': '🚨',
            'meeting': '👥',
            'general': 'ℹ️',
        }
        return icon_map.get(self.event_type, 'ℹ️')


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


class EmailBatch(models.Model):
    PURPOSE_CHOICES = [
        ('common_expense', 'Common Expense'),
        ('debt_reminder', 'Debt Reminder'),
        ('general', 'General'),
    ]

    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES, db_index=True)
    subject = models.CharField(max_length=255, blank=True)
    building = models.ForeignKey(
        Building,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_batches'
    )
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_batches'
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['purpose', 'created_at']),
            models.Index(fields=['building', 'created_at']),
        ]

    def __str__(self):
        return f"{self.purpose} batch {self.id}"


class EmailBatchRecipient(models.Model):
    STATUS_CHOICES = [
        ('invalid', 'Invalid'),
        ('sent_to_provider', 'Sent to Provider'),
        ('failed_immediate', 'Failed Immediate'),
        ('delivered', 'Delivered'),
        ('bounced_hard', 'Bounced Hard'),
        ('bounced_soft', 'Bounced Soft'),
        ('blocked', 'Blocked'),
        ('complaint', 'Complaint'),
        ('unknown_final', 'Unknown Final'),
    ]

    batch = models.ForeignKey(
        EmailBatch,
        on_delete=models.CASCADE,
        related_name='recipients'
    )
    apartment = models.ForeignKey(
        Apartment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_batch_recipients'
    )
    email = models.EmailField(blank=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='invalid',
        db_index=True
    )
    provider_message_id = models.CharField(max_length=200, blank=True, db_index=True)
    provider_request_id = models.CharField(max_length=200, blank=True)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['email', 'status']),
        ]

    def __str__(self):
        return f"{self.email or 'unknown'} ({self.status})"


class UserDeviceToken(models.Model):
    """
    Stores device tokens for push notifications (FCM).
    Each user can have multiple devices.
    """

    PLATFORM_CHOICES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web Browser'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='device_tokens'
    )
    token = models.TextField(
        unique=True,
        help_text="FCM device token"
    )
    platform = models.CharField(
        max_length=20,
        choices=PLATFORM_CHOICES,
        default='android'
    )
    device_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="User-friendly device name"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Token is valid and should receive notifications"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this token was used to send notification"
    )

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.platform} ({self.device_name or 'Unknown'})"

    def mark_used(self):
        """Mark token as recently used."""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])

    def deactivate(self):
        """Deactivate token (e.g., when FCM returns unregistered error)."""
        self.is_active = False
        self.save(update_fields=['is_active'])


class UserViberSubscription(models.Model):
    """
    Stores Viber subscription info for users who opted in.
    Viber user ID is obtained when user starts conversation with bot.
    """

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='viber_subscription'
    )
    viber_user_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Viber user ID from webhook"
    )
    viber_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="User's Viber display name"
    )
    viber_avatar = models.URLField(
        blank=True,
        help_text="User's Viber avatar URL"
    )
    is_subscribed = models.BooleanField(
        default=True,
        help_text="User has not unsubscribed"
    )

    # Metadata
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Viber Subscription"
        verbose_name_plural = "Viber Subscriptions"

    def __str__(self):
        return f"{self.user.email} - Viber: {self.viber_name or self.viber_user_id}"

    def unsubscribe(self):
        """Mark user as unsubscribed from Viber."""
        self.is_subscribed = False
        self.unsubscribed_at = timezone.now()
        self.save(update_fields=['is_subscribed', 'unsubscribed_at'])

    def resubscribe(self):
        """Mark user as resubscribed to Viber."""
        self.is_subscribed = True
        self.unsubscribed_at = None
        self.save(update_fields=['is_subscribed', 'unsubscribed_at'])


class NotificationPreference(models.Model):
    """
    User preferences for notification channels.
    Allows users to opt-in/out of specific channels per category.
    """

    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('viber', 'Viber'),
        ('push', 'Push Notification'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # Can be building-specific or global (null = global)
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='user_notification_preferences'
    )

    # Category preferences (references NotificationTemplate.CATEGORY_CHOICES)
    category = models.CharField(
        max_length=50,
        default='all',
        help_text="'all' or specific category like 'announcement', 'payment', etc."
    )

    # Channel preferences
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    viber_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)

    # Timing preferences
    instant_notifications = models.BooleanField(
        default=True,
        help_text="Receive notifications immediately"
    )
    digest_only = models.BooleanField(
        default=False,
        help_text="Only receive in daily/weekly digest"
    )
    quiet_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text="Don't send between this time..."
    )
    quiet_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text="...and this time"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'building', 'category']
        indexes = [
            models.Index(fields=['user', 'building']),
            models.Index(fields=['user', 'category']),
        ]

    def __str__(self):
        building_name = self.building.name if self.building else "Γενικές"
        return f"{self.user.email} - {building_name} - {self.category}"

    def get_enabled_channels(self):
        """Get list of enabled channels for this preference."""
        channels = []
        if self.email_enabled:
            channels.append('email')
        if self.sms_enabled:
            channels.append('sms')
        if self.viber_enabled:
            channels.append('viber')
        if self.push_enabled:
            channels.append('push')
        return channels

    @classmethod
    def get_user_preferences(cls, user, building=None, category=None):
        """
        Get effective notification preferences for a user.

        Priority: Building+Category specific > Building specific > Category specific > Global
        """
        # Try to find most specific preference
        queryset = cls.objects.filter(user=user)

        if building and category:
            pref = queryset.filter(building=building, category=category).first()
            if pref:
                return pref

        if building:
            pref = queryset.filter(building=building, category='all').first()
            if pref:
                return pref

        if category:
            pref = queryset.filter(building__isnull=True, category=category).first()
            if pref:
                return pref

        # Fall back to global preference
        return queryset.filter(building__isnull=True, category='all').first()

    @classmethod
    def get_or_create_default(cls, user, building=None, category='all'):
        """Get or create a preference with default values."""
        pref, created = cls.objects.get_or_create(
            user=user,
            building=building,
            category=category,
            defaults={
                'email_enabled': True,
                'sms_enabled': False,
                'viber_enabled': True,
                'push_enabled': True,
                'instant_notifications': True,
                'digest_only': False,
            }
        )
        return pref
