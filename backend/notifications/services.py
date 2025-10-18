"""
Email Notification Service
Handles all email notifications for the Digital Concierge platform
"""

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from datetime import timedelta
import logging

from .email_templates import EmailTemplates
from billing.models import UserSubscription
from users.models import CustomUser

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
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Bulk notification sent to {len(recipient_list)} users")
            return True
            
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
            
            html_message = render_to_string('emails/system_announcement.html', context)
            plain_message = strip_tags(html_message)
            
            return self.send_bulk_notification(
                active_users, 
                subject, 
                plain_message, 
                html_message
            )
            
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
            
            html_message = render_to_string('emails/usage_limit_warning.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Usage limit warning sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send usage limit warning: {e}")
            return False

# Global email service instance
email_service = EmailNotificationService()