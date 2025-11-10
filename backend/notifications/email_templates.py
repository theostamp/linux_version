"""
Email Templates for Digital Concierge
Comprehensive email notification system
"""

from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags
from django.template import Context, Template
import logging

logger = logging.getLogger(__name__)

class EmailTemplates:
    """Email template management class"""
    
    @staticmethod
    def send_welcome_email(user, building_name):
        """Send welcome email after registration"""
        try:
            subject = f"Welcome to Digital Concierge - {building_name}"
            
            context = {
                'user_name': user.name,
                'building_name': building_name,
                'login_url': f"{settings.FRONTEND_URL}/login",
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
                'support_email': settings.SUPPORT_EMAIL,
            }
            
            html_message = render_to_string('emails/welcome_email.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Welcome email sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_payment_confirmation(user, subscription, amount):
        """Send payment confirmation email"""
        try:
            subject = f"Payment Confirmed - Digital Concierge"
            
            context = {
                'user_name': user.name,
                'plan_name': subscription.plan.name,
                'amount': amount,
                'currency': 'EUR',
                'next_billing_date': subscription.current_period_end,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
                'billing_url': f"{settings.FRONTEND_URL}/billing",
            }
            
            html_message = render_to_string('emails/payment_confirmation.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Payment confirmation email sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send payment confirmation to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_subscription_renewal_reminder(user, subscription, days_until_renewal):
        """Send subscription renewal reminder"""
        try:
            subject = f"Subscription Renewal Reminder - {days_until_renewal} days"
            
            context = {
                'user_name': user.name,
                'plan_name': subscription.plan.name,
                'amount': subscription.plan.monthly_price,
                'currency': 'EUR',
                'renewal_date': subscription.current_period_end,
                'days_until_renewal': days_until_renewal,
                'billing_url': f"{settings.FRONTEND_URL}/billing",
                'support_email': settings.SUPPORT_EMAIL,
            }
            
            html_message = render_to_string('emails/subscription_renewal.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Subscription renewal reminder sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send renewal reminder to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, reset_token):
        """Send password reset email"""
        try:
            subject = "Password Reset - Digital Concierge"
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
            
            context = {
                'user_name': user.name,
                'reset_url': reset_url,
                'expiry_hours': 24,
                'support_email': settings.SUPPORT_EMAIL,
            }
            
            html_message = render_to_string('emails/password_reset.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Password reset email sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_account_status_notification(user, status, reason=None):
        """Send account status notification"""
        try:
            subject = f"Account Status Update - Digital Concierge"
            
            context = {
                'user_name': user.name,
                'status': status,
                'reason': reason,
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
                'support_email': settings.SUPPORT_EMAIL,
            }
            
            html_message = render_to_string('emails/account_status.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Account status notification sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send account status to {user.email}: {e}")
            return False
    
    @staticmethod
    def send_maintenance_notification(user, maintenance_info):
        """Send maintenance notification"""
        try:
            subject = f"Maintenance Update - {maintenance_info.get('title', 'System Maintenance')}"
            
            context = {
                'user_name': user.name,
                'maintenance_title': maintenance_info.get('title', 'System Maintenance'),
                'maintenance_description': maintenance_info.get('description', ''),
                'scheduled_time': maintenance_info.get('scheduled_time', ''),
                'estimated_duration': maintenance_info.get('estimated_duration', ''),
                'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
                'support_email': settings.SUPPORT_EMAIL,
            }
            
            html_message = render_to_string('emails/maintenance_notification.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Maintenance notification sent to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send maintenance notification to {user.email}: {e}")
            return False
