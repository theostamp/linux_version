"""
Real-time Notification Service
Handles real-time notifications and WebSocket communication
"""

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class RealTimeNotificationService:
    """Service for managing real-time notifications"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def send_user_notification(self, user_id, title, message, notification_type='info', data=None):
        """Send notification to specific user"""
        try:
            group_name = f"user_{user_id}_notifications"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'title': title,
                    'message': message,
                    'notification_type': notification_type,
                    'timestamp': timezone.now().isoformat(),
                    'data': data or {}
                }
            )
            
            logger.info(f"Real-time notification sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send real-time notification to user {user_id}: {e}")
            return False
    
    def send_payment_notification(self, user_id, title, message, amount, currency, status):
        """Send payment notification to user"""
        try:
            group_name = f"user_{user_id}_notifications"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'payment_notification',
                    'title': title,
                    'message': message,
                    'amount': amount,
                    'currency': currency,
                    'status': status,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Payment notification sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send payment notification to user {user_id}: {e}")
            return False
    
    def send_subscription_notification(self, user_id, title, message, plan_name, status):
        """Send subscription notification to user"""
        try:
            group_name = f"user_{user_id}_notifications"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'subscription_notification',
                    'title': title,
                    'message': message,
                    'plan_name': plan_name,
                    'status': status,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Subscription notification sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send subscription notification to user {user_id}: {e}")
            return False
    
    def send_system_notification(self, title, message, priority='normal', tenant_id=None):
        """Send system notification to all users or specific tenant"""
        try:
            if tenant_id:
                group_name = f"notifications_system_{tenant_id}"
            else:
                group_name = "notifications_system_global"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'system_notification',
                    'title': title,
                    'message': message,
                    'priority': priority,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"System notification sent to {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send system notification: {e}")
            return False
    
    def send_dashboard_update(self, tenant_id, data):
        """Send dashboard update to all users in tenant"""
        try:
            group_name = f"dashboard_{tenant_id}"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'dashboard_update',
                    'data': data,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Dashboard update sent to tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send dashboard update to tenant {tenant_id}: {e}")
            return False
    
    def send_stats_update(self, tenant_id, stats):
        """Send statistics update to all users in tenant"""
        try:
            group_name = f"dashboard_{tenant_id}"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'stats_update',
                    'stats': stats,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Stats update sent to tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send stats update to tenant {tenant_id}: {e}")
            return False
    
    def send_chat_message(self, tenant_id, user_id, user_name, message):
        """Send chat message to all users in tenant"""
        try:
            group_name = f"building_{tenant_id}_chat"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'chat_message',
                    'user_id': user_id,
                    'user_name': user_name,
                    'message': message,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Chat message sent to tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send chat message to tenant {tenant_id}: {e}")
            return False
    
    def send_maintenance_notification(self, tenant_id, maintenance_info):
        """Send maintenance notification to all users in tenant"""
        try:
            group_name = f"notifications_maintenance_{tenant_id}"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'title': f"Maintenance: {maintenance_info.get('title', 'System Maintenance')}",
                    'message': maintenance_info.get('description', ''),
                    'notification_type': 'maintenance',
                    'timestamp': timezone.now().isoformat(),
                    'data': maintenance_info
                }
            )
            
            logger.info(f"Maintenance notification sent to tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send maintenance notification to tenant {tenant_id}: {e}")
            return False
    
    def send_usage_warning(self, user_id, usage_type, current_usage, limit):
        """Send usage limit warning to user"""
        try:
            percentage = (current_usage / limit) * 100
            
            if percentage >= 90:
                priority = 'high'
                title = f"Usage Limit Warning - {usage_type.title()}"
                message = f"You've used {percentage:.1f}% of your {usage_type} limit ({current_usage}/{limit})"
            elif percentage >= 75:
                priority = 'medium'
                title = f"Usage Alert - {usage_type.title()}"
                message = f"You've used {percentage:.1f}% of your {usage_type} limit ({current_usage}/{limit})"
            else:
                return True  # No warning needed
            
            group_name = f"user_{user_id}_notifications"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'title': title,
                    'message': message,
                    'notification_type': 'warning',
                    'priority': priority,
                    'timestamp': timezone.now().isoformat(),
                    'data': {
                        'usage_type': usage_type,
                        'current_usage': current_usage,
                        'limit': limit,
                        'percentage': percentage
                    }
                }
            )
            
            logger.info(f"Usage warning sent to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send usage warning to user {user_id}: {e}")
            return False

# Global real-time notification service instance
realtime_service = RealTimeNotificationService()
