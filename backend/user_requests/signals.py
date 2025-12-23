# backend/user_requests/signals.py

from django.db.models.signals import m2m_changed, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import UserRequest, UrgentRequestLog
from .utils import send_urgent_request_email
from announcements.models import Announcement
from users.services import EmailService
import logging

logger = logging.getLogger(__name__)

@receiver(m2m_changed, sender=UserRequest.supporters.through)
def user_request_supporters_changed(sender, instance, action, **kwargs):
    if action == "post_add" and instance.supporters.count() >= 10:
        # Αν δεν υπάρχει ήδη log (για να μην γράφει κάθε φορά)
        if not UrgentRequestLog.objects.filter(user_request=instance).exists():
            UrgentRequestLog.objects.create(
                user_request=instance,
                supporter_count=instance.supporters.count()
            )
            send_urgent_request_email(instance)

@receiver(post_save, sender=UserRequest)
def user_request_status_changed(sender, instance, created, **kwargs):
    """
    Handle logic when a UserRequest (Fault Report) status changes.
    """
    if not created and instance.status == 'completed':
        # Create Kiosk Announcement
        try:
            # Validity: 3 days
            start_date = timezone.now().date()
            end_date = start_date + timezone.timedelta(days=3)
            
            # Author is the one who assigned or the creator as fallback
            author = instance.assigned_to or instance.created_by
            
            announcement_title = f"Αποκατάσταση: {instance.title}"
            
            # Avoid duplicate announcements if saved multiple times
            if not Announcement.objects.filter(
                building=instance.building, 
                title=announcement_title, 
                created_at__gt=timezone.now() - timezone.timedelta(days=1)
            ).exists():
                Announcement.objects.create(
                    building=instance.building,
                    author=author,
                    title=announcement_title,
                    description=f"Η βλάβη '{instance.title}' αποκαταστάθηκε επιτυχώς. Σας ευχαριστούμε για την υπομονή σας.",
                    start_date=start_date,
                    end_date=end_date,
                    published=True,
                    is_active=True,
                    priority=10
                )
                logger.info(f"Created kiosk announcement for resolved UserRequest {instance.id}")
        except Exception as e:
            logger.error(f"Error creating kiosk announcement for UserRequest {instance.id}: {e}")

        # Send Email Notification to the reporter
        if instance.created_by and instance.created_by.email:
            try:
                # We can reuse the same email service method or create a specific one
                # For now, let's use a generic method if it exists or create one
                EmailService.send_maintenance_resolved_email(instance)
                logger.info(f"Sent resolution email for UserRequest {instance.id} to {instance.created_by.email}")
            except Exception as e:
                logger.error(f"Error sending resolution email for UserRequest {instance.id}: {e}")
