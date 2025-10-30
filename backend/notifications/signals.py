"""
Email Notification Signals
Automatically send emails based on system events
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone
from datetime import timedelta
import logging

from .services import email_service
from billing.models import UserSubscription
from users.models import CustomUser

logger = logging.getLogger(__name__)

@receiver(post_save, sender=UserSubscription)
def send_subscription_created_email(sender, instance, created, **kwargs):
    """Send welcome email when subscription is created and payment is confirmed"""
    # Only send email if subscription is created AND status is active (payment confirmed)
    if created and instance.status == 'active':
        try:
            user = instance.user
            
            # Ensure user has correct role and permissions
            if user.role != 'manager':
                user.role = 'manager'
                user.is_staff = True
                user.save(update_fields=['role', 'is_staff'])
                logger.info(f"Updated {user.email} role to manager")
            
            # Add to Manager group
            from django.contrib.auth.models import Group
            manager_group, _ = Group.objects.get_or_create(name='Manager')
            if not user.groups.filter(name='Manager').exists():
                user.groups.add(manager_group)
                logger.info(f"Added {user.email} to Manager group")
            
            # Remove from Resident group if present
            if user.groups.filter(name='Resident').exists():
                resident_group = Group.objects.get(name='Resident')
                user.groups.remove(resident_group)
                logger.info(f"Removed {user.email} from Resident group")
            
            building_name = getattr(user, 'building_name', 'Your Building')
            
            # Send welcome email only after payment confirmation
            email_service.send_welcome_email(user, building_name)
            
            logger.info(f"Welcome email triggered for user {user.email} after payment confirmation")
            
        except Exception as e:
            logger.error(f"Failed to send welcome email for subscription {instance.id}: {e}")
    elif created and instance.status == 'pending':
        # Don't send email for pending subscriptions (before payment)
        logger.info(f"Subscription {instance.id} created with pending status - no email sent yet")

@receiver(post_save, sender=UserSubscription)
def send_payment_confirmation_email(sender, instance, **kwargs):
    """Send payment confirmation when subscription is updated"""
    if instance.status == 'active' and hasattr(instance, '_payment_processed'):
        try:
            user = instance.user
            
            # Ensure user has correct role and permissions when payment is confirmed
            if user.role != 'manager':
                user.role = 'manager'
                user.is_staff = True
                user.save(update_fields=['role', 'is_staff'])
                logger.info(f"Updated {user.email} role to manager on payment confirmation")
            
            # Add to Manager group
            from django.contrib.auth.models import Group
            manager_group, _ = Group.objects.get_or_create(name='Manager')
            if not user.groups.filter(name='Manager').exists():
                user.groups.add(manager_group)
                logger.info(f"Added {user.email} to Manager group on payment confirmation")
            
            # Remove from Resident group if present
            if user.groups.filter(name='Resident').exists():
                resident_group = Group.objects.get(name='Resident')
                user.groups.remove(resident_group)
                logger.info(f"Removed {user.email} from Resident group on payment confirmation")
            
            amount = instance.plan.monthly_price
            
            # Send payment confirmation
            email_service.send_payment_confirmation(user, instance, amount)
            
            logger.info(f"Payment confirmation sent to {user.email}")
            
        except Exception as e:
            logger.error(f"Failed to send payment confirmation for subscription {instance.id}: {e}")

@receiver(post_save, sender=CustomUser)
def send_account_verification_email(sender, instance, created, **kwargs):
    """Send account verification email for new users"""
    if created and not instance.email_verified:
        try:
            # This would typically send a verification email
            # For now, we'll just log it
            logger.info(f"Account verification email should be sent to {instance.email}")
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {instance.email}: {e}")

@receiver(user_logged_in)
def send_login_notification(sender, request, user, **kwargs):
    """Send login notification (optional - can be disabled)"""
    try:
        # Only send if it's been more than 24 hours since last login
        if user.last_login:
            time_since_last_login = timezone.now() - user.last_login
            if time_since_last_login > timedelta(hours=24):
                # Send login notification
                logger.info(f"Login notification could be sent to {user.email}")
                
    except Exception as e:
        logger.error(f"Failed to process login notification for {user.email}: {e}")

# Celery task for scheduled email notifications
from celery import shared_task

@shared_task
def send_scheduled_email_notifications():
    """Send scheduled email notifications"""
    try:
        # Send subscription renewal reminders
        email_service.send_subscription_expiry_warning(days_before_expiry=7)
        email_service.send_subscription_expiry_warning(days_before_expiry=3)
        email_service.send_subscription_expiry_warning(days_before_expiry=1)
        
        logger.info("Scheduled email notifications sent successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send scheduled email notifications: {e}")
        return False

@shared_task
def send_usage_limit_warnings():
    """Send usage limit warnings"""
    try:
        # This would check usage limits and send warnings
        # Implementation depends on your usage tracking system
        logger.info("Usage limit warnings check completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send usage limit warnings: {e}")
        return False
