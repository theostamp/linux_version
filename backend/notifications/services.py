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
