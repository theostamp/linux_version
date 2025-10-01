"""
Notification services for sending emails and SMS.
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from .models import Notification, NotificationRecipient, NotificationTemplate
from apartments.models import Apartment
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for creating and sending notifications.
    """

    @staticmethod
    def create_notification(
        building,
        created_by,
        subject,
        body,
        sms_body='',
        notification_type='email',
        priority='normal',
        scheduled_at=None,
        template=None
    ):
        """
        Create a notification record.

        Returns:
            Notification instance
        """
        notification = Notification.objects.create(
            building=building,
            template=template,
            subject=subject,
            body=body,
            sms_body=sms_body,
            notification_type=notification_type,
            priority=priority,
            status='draft',
            scheduled_at=scheduled_at,
            created_by=created_by,
        )

        logger.info(
            f"Created notification {notification.id}: {subject} "
            f"for building {building.id}"
        )

        return notification

    @staticmethod
    def add_recipients(notification, apartment_ids=None, send_to_all=False):
        """
        Add recipients to a notification.

        Args:
            notification: Notification instance
            apartment_ids: List of apartment IDs (optional)
            send_to_all: If True, add all apartments in building

        Returns:
            Number of recipients added
        """
        building = notification.building

        if send_to_all:
            apartments = Apartment.objects.filter(building=building)
        elif apartment_ids:
            apartments = Apartment.objects.filter(
                id__in=apartment_ids,
                building=building
            )
        else:
            logger.error("No recipients specified")
            return 0

        recipients_created = 0

        for apartment in apartments:
            # Get primary contact (owner or tenant)
            email = apartment.owner_email or ''
            phone = apartment.owner_phone or ''
            name = apartment.owner_name or apartment.number

            # Skip if no contact info
            if notification.notification_type == 'email' and not email:
                logger.warning(
                    f"Skipping apartment {apartment.number} - no email"
                )
                continue

            if notification.notification_type == 'sms' and not phone:
                logger.warning(
                    f"Skipping apartment {apartment.number} - no phone"
                )
                continue

            # Create recipient
            NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=name,
                email=email,
                phone=phone,
                status='pending',
            )
            recipients_created += 1

        # Update notification stats
        notification.total_recipients = recipients_created
        notification.save(update_fields=['total_recipients'])

        logger.info(
            f"Added {recipients_created} recipients to notification {notification.id}"
        )

        return recipients_created

    @staticmethod
    def send_notification(notification):
        """
        Send notification to all recipients.

        Args:
            notification: Notification instance

        Returns:
            Dict with success/failure counts
        """
        if notification.status != 'draft':
            logger.error(
                f"Cannot send notification {notification.id} - "
                f"status is {notification.status}"
            )
            return {'success': 0, 'failed': 0}

        notification.mark_as_sending()

        success_count = 0
        failed_count = 0

        recipients = notification.recipients.filter(status='pending')

        for recipient in recipients:
            try:
                if notification.notification_type in ['email', 'both']:
                    success = EmailService.send_email(
                        recipient=recipient,
                        subject=notification.subject,
                        body=notification.body,
                    )
                    if success:
                        success_count += 1
                    else:
                        failed_count += 1

                if notification.notification_type in ['sms', 'both']:
                    success = SMSService.send_sms(
                        recipient=recipient,
                        body=notification.sms_body,
                    )
                    if success:
                        success_count += 1
                    else:
                        failed_count += 1

            except Exception as e:
                logger.exception(
                    f"Error sending to recipient {recipient.id}: {str(e)}"
                )
                recipient.mark_as_failed(str(e))
                failed_count += 1

        # Update notification statistics
        notification.update_statistics()
        notification.mark_as_sent()

        logger.info(
            f"Notification {notification.id} sent: "
            f"{success_count} success, {failed_count} failed"
        )

        return {
            'success': success_count,
            'failed': failed_count,
        }


class EmailService:
    """
    Service for sending emails.
    """

    @staticmethod
    def send_email(recipient, subject, body):
        """
        Send email to a recipient.

        Args:
            recipient: NotificationRecipient instance
            subject: Email subject
            body: Email body (plain text or HTML)

        Returns:
            bool: True if sent successfully
        """
        if not recipient.email:
            logger.warning(f"Recipient {recipient.id} has no email address")
            recipient.mark_as_failed("No email address")
            return False

        try:
            # Create email with both plain text and HTML
            email = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient.email],
            )

            # Attach HTML version (if body contains HTML tags)
            if '<' in body and '>' in body:
                email.attach_alternative(body, "text/html")

            # Send
            email.send(fail_silently=False)

            # Mark as sent
            recipient.mark_as_sent()

            logger.info(
                f"Email sent to {recipient.email} "
                f"(recipient {recipient.id})"
            )

            return True

        except Exception as e:
            logger.exception(
                f"Failed to send email to {recipient.email}: {str(e)}"
            )
            recipient.mark_as_failed(str(e))
            return False


class SMSService:
    """
    Service for sending SMS.
    """

    @staticmethod
    def send_sms(recipient, body):
        """
        Send SMS to a recipient.

        Args:
            recipient: NotificationRecipient instance
            body: SMS body text

        Returns:
            bool: True if sent successfully
        """
        if not recipient.phone:
            logger.warning(f"Recipient {recipient.id} has no phone number")
            recipient.mark_as_failed("No phone number")
            return False

        # TODO: Implement actual SMS provider integration
        # For now, just log (development mode)
        if settings.DEBUG:
            logger.info(
                f"[SMS DEBUG] To: {recipient.phone}\n"
                f"Message: {body}\n"
                f"(SMS not actually sent in DEBUG mode)"
            )
            recipient.mark_as_sent()
            return True

        # Production SMS sending would go here
        # Example with Twilio:
        # from twilio.rest import Client
        # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        # message = client.messages.create(
        #     body=body,
        #     from_=settings.TWILIO_PHONE_NUMBER,
        #     to=recipient.phone
        # )
        # recipient.mark_as_sent(provider_message_id=message.sid)

        logger.warning("SMS sending not implemented yet")
        recipient.mark_as_failed("SMS service not configured")
        return False


class TemplateService:
    """
    Service for working with notification templates.
    """

    @staticmethod
    def render_template(template, context):
        """
        Render a template with context variables.

        Args:
            template: NotificationTemplate instance
            context: Dict of placeholder values

        Returns:
            Dict with rendered 'subject', 'body', 'sms'
        """
        return template.render(context)

    @staticmethod
    def get_default_context(building, apartment=None):
        """
        Get default context variables for a building/apartment.

        Args:
            building: Building instance
            apartment: Apartment instance (optional)

        Returns:
            Dict of placeholder values
        """
        context = {
            'building_name': building.name,
            'building_address': building.address,
            'current_date': timezone.now().strftime('%d/%m/%Y'),
            'current_month': timezone.now().strftime('%B %Y'),
        }

        if apartment:
            context.update({
                'apartment_number': apartment.number,
                'apartment_floor': apartment.floor or '',
                'owner_name': apartment.owner_name or '',
            })

        return context


class MonthlyTaskService:
    """
    Service for executing monthly notification tasks.
    Handles auto-generation of common expense bills and balance reminders.
    """

    @staticmethod
    def execute_task(task, user):
        """
        Execute a monthly notification task.
        
        Args:
            task: MonthlyNotificationTask instance
            user: User executing the task
        
        Returns:
            Notification instance
        """
        from financial.models import CommonExpensePeriod, ApartmentShare, Transaction
        from buildings.models import Building
        
        # Get building (or all buildings if task.building is None)
        buildings = [task.building] if task.building else Building.objects.all()
        
        notifications_created = []
        
        for building in buildings:
            # Get all apartments in building
            apartments = building.apartments.all()
            
            if task.task_type == 'common_expense':
                # Generate common expense bill for each apartment
                notification = MonthlyTaskService._generate_common_expense_notification(
                    building=building,
                    apartments=apartments,
                    template=task.template,
                    period_month=task.period_month,
                    user=user
                )
            elif task.task_type == 'balance_reminder':
                # Generate balance reminder for apartments with outstanding balance
                notification = MonthlyTaskService._generate_balance_reminder_notification(
                    building=building,
                    apartments=apartments,
                    template=task.template,
                    period_month=task.period_month,
                    user=user
                )
            else:
                # Custom task - use template as-is
                notification = MonthlyTaskService._generate_custom_notification(
                    building=building,
                    apartments=apartments,
                    template=task.template,
                    period_month=task.period_month,
                    user=user
                )
            
            notifications_created.append(notification)
        
        # Return first notification (or create aggregate if multiple buildings)
        return notifications_created[0] if notifications_created else None

    @staticmethod
    def _generate_common_expense_notification(building, apartments, template, period_month, user):
        """Generate personalized common expense bill for each apartment."""
        from financial.models import CommonExpensePeriod, ApartmentShare, Transaction
        
        # Calculate period range
        period_start = period_month
        period_end = period_month.replace(day=28) + timezone.timedelta(days=4)
        period_end = period_end.replace(day=1) - timezone.timedelta(days=1)
        
        # Create notification
        notification = NotificationService.create_notification(
            building=building,
            created_by=user,
            subject=f"Λογαριασμός Κοινοχρήστων {period_month.strftime('%m/%Y')}",
            body="See individual apartment notifications",
            notification_type='email',
            priority='high',
            template=template
        )
        
        # Create recipients with personalized content
        for apartment in apartments:
            # Calculate financial data
            common_expense_amount = MonthlyTaskService._calculate_common_expense(apartment, period_month)
            previous_balance = MonthlyTaskService._calculate_previous_balance(apartment, period_month)
            total_amount = common_expense_amount + previous_balance
            
            # Build context
            context = {
                'period': period_month.strftime('%m/%Y'),
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Ιδιοκτήτης',
                'common_expense_amount': f"{common_expense_amount:.2f}€",
                'previous_balance': f"{previous_balance:.2f}€",
                'total_amount': f"{total_amount:.2f}€",
                'due_date': (period_end + timezone.timedelta(days=10)).strftime('%d/%m/%Y'),
                'bank_account': building.bank_account or 'GR00 0000 0000 0000 0000 0000 000',
                'building_name': building.name or f"{building.street} {building.number}",
                'manager_phone': building.manager_phone or '210 1234567',
                'manager_email': building.manager_email or 'manager@building.gr',
            }
            
            # Render template
            if template:
                rendered_subject, rendered_body, rendered_sms = TemplateService.render_template(
                    template, context
                )
            else:
                rendered_subject = notification.subject
                rendered_body = f"Κοινόχρηστα: {common_expense_amount:.2f}€, Προηγούμενο Υπόλοιπο: {previous_balance:.2f}€, Σύνολο: {total_amount:.2f}€"
                rendered_sms = rendered_body[:160]
            
            # Create recipient
            NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=apartment.owner_name or 'Ιδιοκτήτης',
                email=apartment.owner_email or '',
                phone=apartment.owner_phone or '',
                status='pending'
            )
        
        # Send notification
        NotificationService.send_notification(notification)
        
        return notification

    @staticmethod
    def _generate_balance_reminder_notification(building, apartments, template, period_month, user):
        """Generate balance reminder for apartments with outstanding balance."""
        
        # Filter apartments with positive balance (debt)
        apartments_with_debt = []
        for apartment in apartments:
            balance = MonthlyTaskService._calculate_previous_balance(apartment, period_month)
            if balance > 0:
                apartments_with_debt.append((apartment, balance))
        
        if not apartments_with_debt:
            # No apartments with debt - skip notification
            return None
        
        # Create notification
        notification = NotificationService.create_notification(
            building=building,
            created_by=user,
            subject=f"Υπενθύμιση Οφειλών {period_month.strftime('%m/%Y')}",
            body="See individual apartment notifications",
            notification_type='email',
            priority='normal',
            template=template
        )
        
        # Create recipients
        for apartment, balance in apartments_with_debt:
            context = {
                'apartment_number': apartment.number,
                'owner_name': apartment.owner_name or 'Ιδιοκτήτης',
                'balance_amount': f"{balance:.2f}€",
                'building_name': building.name or f"{building.street} {building.number}",
                'manager_phone': building.manager_phone or '210 1234567',
                'manager_email': building.manager_email or 'manager@building.gr',
            }
            
            if template:
                rendered_subject, rendered_body, rendered_sms = TemplateService.render_template(
                    template, context
                )
            else:
                rendered_subject = notification.subject
                rendered_body = f"Υπενθύμιση οφειλής: {balance:.2f}€"
                rendered_sms = rendered_body[:160]
            
            NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=apartment.owner_name or 'Ιδιοκτήτης',
                email=apartment.owner_email or '',
                phone=apartment.owner_phone or '',
                status='pending'
            )
        
        # Send notification
        NotificationService.send_notification(notification)
        
        return notification

    @staticmethod
    def _generate_custom_notification(building, apartments, template, period_month, user):
        """Generate custom notification using template."""
        
        # Use template as-is for all apartments
        context = {
            'building_name': building.name or f"{building.street} {building.number}",
            'manager_phone': building.manager_phone or '210 1234567',
            'manager_email': building.manager_email or 'manager@building.gr',
            'period': period_month.strftime('%m/%Y'),
        }
        
        if template:
            rendered_subject, rendered_body, rendered_sms = TemplateService.render_template(
                template, context
            )
        else:
            rendered_subject = f"Ειδοποίηση {period_month.strftime('%m/%Y')}"
            rendered_body = "Γενική ειδοποίηση"
            rendered_sms = rendered_body[:160]
        
        notification = NotificationService.create_notification(
            building=building,
            created_by=user,
            subject=rendered_subject,
            body=rendered_body,
            sms_body=rendered_sms,
            notification_type='email',
            priority='normal',
            template=template
        )
        
        # Add all apartments as recipients
        for apartment in apartments:
            NotificationRecipient.objects.create(
                notification=notification,
                apartment=apartment,
                recipient_name=apartment.owner_name or 'Ιδιοκτήτης',
                email=apartment.owner_email or '',
                phone=apartment.owner_phone or '',
                status='pending'
            )
        
        # Send notification
        NotificationService.send_notification(notification)
        
        return notification

    @staticmethod
    def _calculate_common_expense(apartment, period_month):
        """Calculate common expense for apartment for given period."""
        from financial.models import CommonExpensePeriod, ApartmentShare

        # Get common expense period for this month
        try:
            # Find period that includes this month
            period = CommonExpensePeriod.objects.filter(
                building=apartment.building,
                start_date__year=period_month.year,
                start_date__month=period_month.month
            ).first()

            if period:
                # Get apartment share for this period
                share = ApartmentShare.objects.filter(
                    period=period,
                    apartment=apartment
                ).first()

                if share:
                    return float(share.total_amount)
                else:
                    logger.warning(f"No ApartmentShare found for {apartment.number} in period {period.period_name}")
            else:
                logger.warning(f"No CommonExpensePeriod found for {apartment.building.name} in {period_month.strftime('%m/%Y')}")
        except Exception as e:
            logger.error(f"Error calculating common expense: {e}")

        return 0.0

    @staticmethod
    def _calculate_previous_balance(apartment, period_month):
        """Calculate previous balance (debt) for apartment before given period."""
        from financial.models import Transaction
        
        # Calculate balance from transactions before period_month
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lt=period_month
        )
        
        balance = 0.0
        for transaction in transactions:
            if transaction.transaction_type in ['common_expense', 'obligation']:
                balance += transaction.amount
            elif transaction.transaction_type == 'payment':
                balance -= transaction.amount
        
        return balance
