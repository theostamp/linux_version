"""
Email Notification Service
Handles all email notifications for the Digital Concierge platform
"""

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta
import logging

from .email_templates import EmailTemplates
from billing.models import UserSubscription
from users.models import CustomUser
from .push_service import PushNotificationService
from core.emailing import send_templated_email

logger = logging.getLogger(__name__)

class EmailNotificationService:
    """Service for managing email notifications"""

    def __init__(self):
        self.templates = EmailTemplates()

    def send_welcome_email(self, user, building_name):
        """Send welcome email after user registration"""
        try:
            return self.templates.send_welcome_email(user, building_name)
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            return False

    def send_payment_confirmation(self, user, subscription, amount):
        """Send payment confirmation email"""
        try:
            return self.templates.send_payment_confirmation(user, subscription, amount)
        except Exception as e:
            logger.error(f"Failed to send payment confirmation: {e}")
            return False

    def send_subscription_renewal_reminder(self, user, subscription, days_until_renewal):
        """Send subscription renewal reminder"""
        try:
            return self.templates.send_subscription_renewal_reminder(user, subscription, days_until_renewal)
        except Exception as e:
            logger.error(f"Failed to send renewal reminder: {e}")
            return False

    def send_password_reset_email(self, user, reset_token):
        """Send password reset email"""
        try:
            return self.templates.send_password_reset_email(user, reset_token)
        except Exception as e:
            logger.error(f"Failed to send password reset: {e}")
            return False

    def send_account_status_notification(self, user, status, reason=None):
        """Send account status notification"""
        try:
            return self.templates.send_account_status_notification(user, status, reason)
        except Exception as e:
            logger.error(f"Failed to send account status: {e}")
            return False

    def send_maintenance_notification(self, user, maintenance_info):
        """Send maintenance notification"""
        try:
            return self.templates.send_maintenance_notification(user, maintenance_info)
        except Exception as e:
            logger.error(f"Failed to send maintenance notification: {e}")
            return False

    def send_bulk_notification(self, users, subject, message, html_message=None):
        """Send bulk notification to multiple users"""
        try:
            recipient_list = [user.email for user in users if user.email]

            if not recipient_list:
                logger.warning("No valid email addresses found for bulk notification")
                return False

            # Send individually to avoid leaking recipients in To/CC headers.
            all_sent = True
            for email in recipient_list:
                ok = send_templated_email(
                    to=email,
                    subject=subject,
                    template_html="emails/wrapper.html" if html_message else "emails/wrapper.html",
                    context={
                        "body_html": html_message or message,
                        "wrapper_title": subject,
                    },
                )
                if not ok:
                    all_sent = False

            logger.info(f"Bulk notification sent to {len(recipient_list)} users")
            return all_sent

        except Exception as e:
            logger.error(f"Failed to send bulk notification: {e}")
            return False

    def send_system_announcement(self, announcement):
        """Send system announcement to all active users"""
        try:
            # Get all active users
            active_users = CustomUser.objects.filter(is_active=True, email_verified=True)

            subject = f"System Announcement: {announcement.title}"

            context = {
                'announcement_title': announcement.title,
                'announcement_content': announcement.content,
                'announcement_date': announcement.created_at,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
            }

            # Send individually with unified base template.
            sent_any = False
            for user in active_users:
                if not user.email:
                    continue
                ok = send_templated_email(
                    to=user.email,
                    subject=subject,
                    template_html="emails/system_announcement.html",
                    context=context,
                    user=user,
                )
                sent_any = sent_any or ok
            return sent_any

        except Exception as e:
            logger.error(f"Failed to send system announcement: {e}")
            return False

    def send_subscription_expiry_warning(self, days_before_expiry=7):
        """Send subscription expiry warnings"""
        try:
            # Get subscriptions expiring in the specified days
            expiry_date = timezone.now().date() + timedelta(days=days_before_expiry)

            expiring_subscriptions = UserSubscription.objects.filter(
                current_period_end__date=expiry_date,
                status='active'
            )

            sent_count = 0
            for subscription in expiring_subscriptions:
                user = subscription.user
                days_until_expiry = (subscription.current_period_end.date() - timezone.now().date()).days

                if self.send_subscription_renewal_reminder(user, subscription, days_until_expiry):
                    sent_count += 1

            logger.info(f"Sent {sent_count} subscription expiry warnings")
            return sent_count > 0

        except Exception as e:
            logger.error(f"Failed to send subscription expiry warnings: {e}")
            return False

    def send_usage_limit_warning(self, user, usage_type, current_usage, limit):
        """Send usage limit warning"""
        try:
            subject = f"Usage Limit Warning - {usage_type.title()}"

            context = {
                'user_name': user.name,
                'usage_type': usage_type,
                'current_usage': current_usage,
                'limit': limit,
                'percentage': (current_usage / limit) * 100,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
                'billing_url': f"{settings.FRONTEND_URL}/billing",
            }

            send_templated_email(
                to=user.email,
                subject=subject,
                template_html="emails/usage_limit_warning.html",
                context=context,
                user=user,
            )

            logger.info(f"Usage limit warning sent to {user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send usage limit warning: {e}")
            return False

class NotificationEventService:
    """Service for managing notification events"""

    @staticmethod
    def create_event(event_type, building, title, description, url='',
                    is_urgent=False, icon='', event_date=None, related_announcement_id=None,
                    related_vote_id=None, related_maintenance_id=None,
                    related_project_id=None):
        """
        Create a new notification event.

        Args:
            event_type: Type of event (announcement, vote, maintenance, etc.)
            building: Building instance
            title: Event title
            description: Event description
            url: Optional URL to event detail page
            is_urgent: Whether this is an urgent event
            icon: Optional icon/emoji
            event_date: Optional datetime when the actual event occurs
            related_*_id: Optional related object IDs for reference

        Returns:
            NotificationEvent instance
        """
        from .models import NotificationEvent

        event = NotificationEvent.objects.create(
            event_type=event_type,
            building=building,
            title=title,
            description=description,
            url=url,
            is_urgent=is_urgent,
            icon=icon,
            event_date=event_date,
            related_announcement_id=related_announcement_id,
            related_vote_id=related_vote_id,
            related_maintenance_id=related_maintenance_id,
            related_project_id=related_project_id
        )

        logger.info(f"Created notification event: {event_type} - {title}")
        return event

    @staticmethod
    def get_pending_events(building, since_datetime=None):
        """
        Get pending notification events for a building.

        Args:
            building: Building instance
            since_datetime: Optional datetime to filter events since

        Returns:
            QuerySet of pending NotificationEvent instances
        """
        from .models import NotificationEvent

        queryset = NotificationEvent.objects.filter(
            building=building,
            included_in_digest=False,
            sent_immediately=False
        )

        if since_datetime:
            queryset = queryset.filter(created_at__gte=since_datetime)

        return queryset.order_by('-created_at')

    @staticmethod
    def group_events_by_type(events):
        """
        Group events by their type for digest organization.

        Args:
            events: QuerySet or list of NotificationEvent instances

        Returns:
            Dict with event_type as key and list of events as value
        """
        grouped = {}
        for event in events:
            event_type = event.event_type
            if event_type not in grouped:
                grouped[event_type] = []
            grouped[event_type].append(event)

        return grouped

    @staticmethod
    def mark_events_as_sent_in_digest(events):
        """
        Mark multiple events as sent in digest.

        Args:
            events: QuerySet or list of NotificationEvent instances
        """
        from django.utils import timezone

        for event in events:
            event.mark_as_sent_in_digest()

        logger.info(f"Marked {len(events)} events as sent in digest")

    @staticmethod
    def get_urgent_events(building, since_datetime=None):
        """
        Get urgent events that should be sent immediately.

        Args:
            building: Building instance
            since_datetime: Optional datetime to filter events since

        Returns:
            QuerySet of urgent NotificationEvent instances
        """
        from .models import NotificationEvent

        queryset = NotificationEvent.objects.filter(
            building=building,
            is_urgent=True,
            sent_immediately=False
        )

        if since_datetime:
            queryset = queryset.filter(created_at__gte=since_datetime)

        return queryset.order_by('-created_at')


class NotificationService:
    """Service for managing notifications"""

    @staticmethod
    def create_notification(building, created_by, subject, body, sms_body='',
                          notification_type='email', priority='normal',
                          scheduled_at=None, template=None):
        """
        Create a new notification.

        Args:
            building: Building instance
            created_by: User who created the notification
            subject: Notification subject
            body: Notification body
            sms_body: Optional SMS body
            notification_type: Type of notification (email, sms, both, push, all)
            priority: Priority level (low, normal, high, urgent)
            scheduled_at: Optional scheduled send time
            template: Optional template used

        Returns:
            Notification instance
        """
        from .models import Notification

        notification = Notification.objects.create(
            building=building,
            created_by=created_by,
            subject=subject,
            body=body,
            sms_body=sms_body,
            notification_type=notification_type,
            priority=priority,
            scheduled_at=scheduled_at,
            template=template,
            status='draft' if scheduled_at else 'scheduled'
        )

        logger.info(f"Created notification: {subject}")
        return notification

    @staticmethod
    def add_recipients(notification, apartment_ids=None, send_to_all=False):
        """
        Add recipients to a notification.

        Args:
            notification: Notification instance
            apartment_ids: List of apartment IDs to send to
            send_to_all: If True, send to all apartments in building
        """
        from .models import NotificationRecipient
        from apartments.models import Apartment

        if send_to_all:
            apartments = Apartment.objects.filter(building=notification.building)
        elif apartment_ids:
            apartments = Apartment.objects.filter(
                id__in=apartment_ids,
                building=notification.building
            )
        else:
            return

        recipients = []
        for apartment in apartments:
            recipient = NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=apartment.occupant_name or '',
                email=apartment.occupant_email or '',
                phone=apartment.occupant_phone or ''
            )
            recipients.append(recipient)

        # Update notification statistics
        notification.total_recipients = len(recipients)
        notification.save(update_fields=['total_recipients'])

        logger.info(f"Added {len(recipients)} recipients to notification")
        return recipients

    @staticmethod
    def send_notification(notification):
        """
        Send a notification to all its recipients.

        Args:
            notification: Notification instance

        Returns:
            Dict with send results
        """
        notification.mark_as_sending()

        successful = 0
        failed = 0

        for recipient in notification.recipients.all():
            try:
                # Email delivery (primary)
                if notification.notification_type in ['email', 'both', 'all']:
                    if not recipient.email:
                        recipient.mark_as_failed("No email address")
                        failed += 1
                        continue

                    email_ok = email_service.send_bulk_notification(
                        [recipient],  # Single recipient for now
                        notification.subject,
                        notification.body
                    )
                    if not email_ok:
                        recipient.mark_as_failed("Email send failed")
                        failed += 1
                        continue

                # Send SMS if notification type includes SMS
                if notification.notification_type in ['sms', 'both', 'all'] and recipient.phone:
                    # SMS sending would be implemented here
                    pass

                # Send Push Notification
                if notification.notification_type in ['push', 'all']:
                    user = None
                    if recipient.apartment:
                        # Try to resolve user from apartment
                        # Assuming apartment has owner_user or tenant_user linked
                        if hasattr(recipient.apartment, 'owner_user') and recipient.apartment.owner_user:
                            user = recipient.apartment.owner_user
                        elif hasattr(recipient.apartment, 'tenant_user') and recipient.apartment.tenant_user:
                            user = recipient.apartment.tenant_user

                    if user:
                        PushNotificationService.send_to_user(
                            user=user,
                            title=notification.subject,
                            body=notification.sms_body or notification.body[:150], # Use shorter body for push
                            data={'notification_id': str(notification.id)}
                        )

                recipient.mark_as_sent()
                successful += 1

            except Exception as e:
                recipient.mark_as_failed(str(e))
                failed += 1
                logger.error(f"Failed to send to {recipient.email}: {e}")

        # Update notification statistics
        notification.successful_sends = successful
        notification.failed_sends = failed
        notification.save(update_fields=['successful_sends', 'failed_sends'])

        if failed == 0:
            notification.mark_as_sent()
        else:
            notification.mark_as_failed(f"{failed} recipients failed")

        return {
            'successful': successful,
            'failed': failed,
            'total': successful + failed
        }


class TemplateService:
    """Service for managing notification templates"""

    @staticmethod
    def get_templates(building, category=None):
        """
        Get notification templates for a building.

        Args:
            building: Building instance
            category: Optional category filter

        Returns:
            QuerySet of NotificationTemplate instances
        """
        from .models import NotificationTemplate

        queryset = NotificationTemplate.objects.filter(
            building=building,
            is_active=True
        )

        if category:
            queryset = queryset.filter(category=category)

        return queryset.order_by('category', 'name')

    @staticmethod
    def create_template(building, name, category, subject, body_template,
                       sms_template='', description=''):
        """
        Create a new notification template.

        Args:
            building: Building instance
            name: Template name
            category: Template category
            subject: Email subject template
            body_template: Email body template
            sms_template: Optional SMS template
            description: Optional description

        Returns:
            NotificationTemplate instance
        """
        from .models import NotificationTemplate

        template = NotificationTemplate.objects.create(
            building=building,
            name=name,
            category=category,
            subject=subject,
            body_template=body_template,
            sms_template=sms_template,
            description=description
        )

        logger.info(f"Created template: {name}")
        return template

    @staticmethod
    def render_template(template, context):
        """
        Render a template with provided context.

        Args:
            template: NotificationTemplate instance
            context: Dict of context variables

        Returns:
            Dict with rendered subject, body, and sms
        """
        return template.render(context)


class DigestService:
    """Service for managing digest notifications"""

    @staticmethod
    def get_digest_preview(building, since_date=None):
        """
        Get a preview of events that would be included in a digest.

        Args:
            building: Building instance
            since_date: Optional date to filter events since

        Returns:
            Dict with digest preview data
        """
        from .models import NotificationEvent
        from django.utils import timezone

        if not since_date:
            # Default to last 7 days
            since_date = timezone.now() - timezone.timedelta(days=7)

        events = NotificationEventService.get_pending_events(building, since_date)
        grouped_events = NotificationEventService.group_events_by_type(events)

        return {
            'total_events': events.count(),
            'events_by_type': grouped_events,
            'since_date': since_date,
            'building_name': building.name
        }

    @staticmethod
    def send_digest(building, created_by, since_date=None):
        """
        Send a digest notification with pending events.

        Args:
            building: Building instance
            created_by: User who triggered the digest
            since_date: Optional date to filter events since

        Returns:
            Notification instance
        """
        from .models import Notification
        from django.utils import timezone

        if not since_date:
            # Default to last 7 days
            since_date = timezone.now() - timezone.timedelta(days=7)

        # Get pending events
        events = NotificationEventService.get_pending_events(building, since_date)

        if not events.exists():
            return None

        # Create digest notification
        subject = f"Εβδομαδιαίο Δελτίο - {building.name}"
        body = f"Δελτίο ενημερώσεων για την περίοδο από {since_date.strftime('%d/%m/%Y')}:\n\n"

        grouped_events = NotificationEventService.group_events_by_type(events)

        for event_type, type_events in grouped_events.items():
            body += f"\n{type_events[0].get_icon()} {type_events[0].get_event_type_display()}:\n"
            for event in type_events:
                body += f"  • {event.title}\n"
                if event.description:
                    body += f"    {event.description[:100]}...\n"
                if event.url:
                    body += f"    Δείτε περισσότερα: {event.url}\n"
            body += "\n"

        # Create notification
        notification = NotificationService.create_notification(
            building=building,
            created_by=created_by,
            subject=subject,
            body=body,
            notification_type='email',
            priority='normal'
        )

        # Add all apartments as recipients
        NotificationService.add_recipients(notification, send_to_all=True)

        # Send the notification
        result = NotificationService.send_notification(notification)

        # Mark events as sent in digest
        NotificationEventService.mark_events_as_sent_in_digest(events)

        logger.info(f"Sent digest notification with {events.count()} events")
        return notification


class MonthlyTaskService:
    """Service for managing monthly notification tasks"""

    @staticmethod
    def execute_task(task, user):
        """
        Execute a monthly notification task by creating and sending the notification.

        Args:
            task: MonthlyNotificationTask instance
            user: User who executes the task

        Returns:
            Notification instance
        """
        from .models import MonthlyNotificationTask, NotificationTemplate

        if not task.template and task.task_type != 'common_expense':
            raise ValueError("Task must have a template to execute")

        # Build context for template rendering
        context = MonthlyTaskService._build_context(task)

        # Render template (optional for common expense)
        rendered = task.template.render(context) if task.template else {
            'subject': '',
            'body': '',
            'sms': ''
        }

        if task.task_type == 'common_expense':
            if not task.building:
                raise ValueError("Common expense task requires a building")

            from .common_expense_service import CommonExpenseNotificationService

            month_display = task.period_month.strftime('%B %Y')
            custom_message = rendered.get('body', '').strip()
            subject_prefix = rendered.get('subject', '').strip() or None

            results = CommonExpenseNotificationService.send_common_expense_notifications(
                building_id=task.building.id,
                month=task.period_month,
                include_sheet=True,
                include_notification=True,
                custom_message=custom_message or None,
                subject_prefix=subject_prefix,
                sender_user=user,
            )

            subject = subject_prefix or f"Κοινόχρηστα {month_display}"
            notification = NotificationService.create_notification(
                building=task.building,
                created_by=user,
                subject=subject,
                body=custom_message or subject,
                sms_body=rendered.get('sms', ''),
                notification_type='email',
                priority='normal',
                template=task.template,
            )

            total_recipients = results['sent_count'] + results['failed_count']
            notification.total_recipients = total_recipients
            notification.successful_sends = results['sent_count']
            notification.failed_sends = results['failed_count']
            notification.sent_at = timezone.now()
            notification.save(update_fields=[
                'total_recipients',
                'successful_sends',
                'failed_sends',
                'sent_at',
            ])

            if results['failed_count']:
                errors = [
                    detail.get('error') for detail in results['details']
                    if detail.get('status') == 'failed' and detail.get('error')
                ]
                error_message = "; ".join(errors[:3]) if errors else "Partial failure sending common expense notices."
                notification.mark_as_failed(error_message)
            else:
                notification.mark_as_sent()

            logger.info(
                "Executed common expense task %s - %s sent, %s failed",
                task.id,
                results['sent_count'],
                results['failed_count'],
            )
            return notification

        # Create notification
        notification = NotificationService.create_notification(
            building=task.building,
            created_by=user,
            subject=rendered['subject'],
            body=rendered['body'],
            sms_body=rendered.get('sms', ''),
            notification_type='email',
            priority='normal',
            template=task.template
        )

        # Add all apartments as recipients
        NotificationService.add_recipients(notification, send_to_all=True)

        # Send notification
        NotificationService.send_notification(notification)

        logger.info(f"Executed monthly task {task.id} - notification {notification.id} sent")
        return notification

    @staticmethod
    def _build_context(task):
        """
        Build context dictionary for template rendering.

        Args:
            task: MonthlyNotificationTask instance

        Returns:
            Dict with context variables
        """
        from financial.models import MonthlyBalance
        from django.utils import timezone

        context = {
            'building_name': task.building.name if task.building else '',
            'month': task.period_month.strftime('%B'),
            'year': task.period_month.year,
            'period': task.period_month.strftime('%m/%Y'),
        }

        # Add financial data if available
        if task.building and task.task_type == 'common_expense':
            try:
                monthly_balance = MonthlyBalance.objects.filter(
                    building=task.building,
                    year=task.period_month.year,
                    month=task.period_month.month
                ).first()

                if monthly_balance:
                    context['total_expenses'] = monthly_balance.total_expenses
                    context['total_collected'] = monthly_balance.total_collected
                    context['carry_forward'] = monthly_balance.carry_forward
            except Exception as e:
                logger.warning(f"Could not load financial data for task {task.id}: {e}")

        return context

    @staticmethod
    def configure_task(building, task_type, day_of_month, time_to_send, template,
                      auto_send_enabled=False, period_month=None,
                      recurrence_type='monthly', day_of_week=None):
        """
        Configure or create a recurring notification task.

        Args:
            building: Building instance (or None for all buildings)
            task_type: Task type ('common_expense', 'balance_reminder', 'custom')
            recurrence_type: How often to repeat ('once', 'weekly', 'biweekly', 'monthly')
            day_of_week: Day of week for weekly/biweekly (0=Monday, 6=Sunday)
            day_of_month: Day of month (1-31) - for monthly tasks
            time_to_send: Time to send (HH:MM format)
            template: NotificationTemplate instance
            auto_send_enabled: Whether to enable auto-send
            period_month: Date for period (defaults to next month)

        Returns:
            MonthlyNotificationTask instance
        """
        from .models import MonthlyNotificationTask
        from django.utils import timezone
        from datetime import date

        if not period_month:
            # Default to next month
            now = timezone.now()
            if now.month == 12:
                period_month = date(now.year + 1, 1, 1)
            else:
                period_month = date(now.year, now.month + 1, 1)

        # Build defaults with recurrence settings
        defaults = {
            'template': template,
            'recurrence_type': recurrence_type,
            'day_of_week': day_of_week,
            'day_of_month': day_of_month,
            'time_to_send': time_to_send,
            'auto_send_enabled': auto_send_enabled,
            'status': 'pending_confirmation'
        }

        # Get or create task
        task, created = MonthlyNotificationTask.objects.get_or_create(
            building=building,
            task_type=task_type,
            period_month=period_month,
            defaults=defaults
        )

        if not created:
            # Update existing task
            task.template = template
            task.recurrence_type = recurrence_type
            task.day_of_week = day_of_week
            task.day_of_month = day_of_month
            task.time_to_send = time_to_send
            task.auto_send_enabled = auto_send_enabled
            task.save()

        # Calculate and set next scheduled time
        if task.recurrence_type != 'once':
            task.next_scheduled_at = task.calculate_next_scheduled_at()
            task.save(update_fields=['next_scheduled_at'])

        logger.info(f"{'Created' if created else 'Updated'} recurring task {task.id} ({recurrence_type})")
        return task

    @staticmethod
    def preview_task(task_id, context=None):
        """
        Preview what notification would be sent for a task.

        Args:
            task_id: MonthlyNotificationTask ID
            context: Optional additional context variables

        Returns:
            Dict with rendered subject, body, sms
        """
        from .models import MonthlyNotificationTask

        task = MonthlyNotificationTask.objects.get(id=task_id)

        if not task.template:
            raise ValueError("Task must have a template to preview")

        # Build context
        base_context = MonthlyTaskService._build_context(task)
        if context:
            base_context.update(context)

        # Render template
        rendered = task.template.render(base_context)

        return {
            'subject': rendered['subject'],
            'body': rendered['body'],
            'sms': rendered.get('sms', ''),
            'task': {
                'id': task.id,
                'task_type': task.task_type,
                'building_name': task.building.name if task.building else 'Όλα τα κτίρια',
                'day_of_month': task.day_of_month,
                'time_to_send': str(task.time_to_send),
                'period_month': task.period_month.strftime('%Y-%m-%d'),
            }
        }

    @staticmethod
    def test_send(task_id, test_email, user):
        """
        Send a test notification to a specific email address.

        Args:
            task_id: MonthlyNotificationTask ID
            test_email: Email address to send test to
            user: User who triggers the test

        Returns:
            Dict with send result
        """
        from .models import MonthlyNotificationTask
        from apartments.models import Apartment

        task = MonthlyNotificationTask.objects.get(id=task_id)

        if not task.template:
            raise ValueError("Task must have a template to test")

        # Build context
        context = MonthlyTaskService._build_context(task)

        # Render template
        rendered = task.template.render(context)

        # Create test notification
        notification = NotificationService.create_notification(
            building=task.building,
            created_by=user,
            subject=f"[TEST] {rendered['subject']}",
            body=rendered['body'],
            sms_body=rendered.get('sms', ''),
            notification_type='email',
            priority='normal',
            template=task.template
        )

        # Create a temporary recipient for test email
        from .models import NotificationRecipient

        # Find an apartment to use as recipient (or create a dummy one)
        apartment = None
        if task.building:
            apartment = Apartment.objects.filter(building=task.building).first()

        if apartment:
            recipient = NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name='Test Recipient',
                email=test_email,
                phone='',
                status='pending'
            )
        else:
            # Create without apartment if no building/apartment available
            recipient = NotificationRecipient.objects.create(
                notification=notification,
                apartment=None,
                recipient_name='Test Recipient',
                email=test_email,
                phone='',
                status='pending'
            )

        # Send test notification
        try:
            send_templated_email(
                to=test_email,
                subject=notification.subject,
                template_html="emails/wrapper.html",
                context={"body_html": notification.body, "wrapper_title": notification.subject},
            )

            recipient.mark_as_sent()
            notification.mark_as_sent()

            return {
                'success': True,
                'message': f'Test email sent successfully to {test_email}',
                'notification_id': notification.id
            }
        except Exception as e:
            recipient.mark_as_failed(str(e))
            notification.mark_as_failed(str(e))
            logger.error(f"Test send failed: {e}")
            return {
                'success': False,
                'message': f'Failed to send test email: {str(e)}',
                'notification_id': notification.id
            }


# Global email service instance
email_service = EmailNotificationService()
