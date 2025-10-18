"""
WebSocket Consumers for Real-time Notifications
Handles real-time communication for Digital Concierge
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django_tenants.utils import get_tenant_model

User = get_user_model()
logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time notifications"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope["user"]
        self.tenant = self.scope.get("tenant")
        
        if self.user.is_authenticated:
            # Create room group for user
            self.room_group_name = f"user_{self.user.id}_notifications"
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Send welcome message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to Digital Concierge notifications',
                'user_id': self.user.id,
                'tenant': self.tenant.schema_name if self.tenant else 'public'
            }))
            
            logger.info(f"User {self.user.email} connected to notifications")
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"User {self.user.email if self.user.is_authenticated else 'Anonymous'} disconnected")
    
    async def receive(self, text_data):
        """Handle received WebSocket messages"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            
            elif message_type == 'subscribe':
                # Subscribe to specific notification types
                notification_types = text_data_json.get('types', [])
                await self.subscribe_to_notifications(notification_types)
            
            elif message_type == 'unsubscribe':
                # Unsubscribe from specific notification types
                notification_types = text_data_json.get('types', [])
                await self.unsubscribe_from_notifications(notification_types)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def subscribe_to_notifications(self, notification_types):
        """Subscribe to specific notification types"""
        for notification_type in notification_types:
            group_name = f"notifications_{notification_type}"
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )
        
        await self.send(text_data=json.dumps({
            'type': 'subscription_confirmed',
            'message': f'Subscribed to {len(notification_types)} notification types',
            'types': notification_types
        }))
    
    async def unsubscribe_from_notifications(self, notification_types):
        """Unsubscribe from specific notification types"""
        for notification_type in notification_types:
            group_name = f"notifications_{notification_type}"
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )
        
        await self.send(text_data=json.dumps({
            'type': 'unsubscription_confirmed',
            'message': f'Unsubscribed from {len(notification_types)} notification types',
            'types': notification_types
        }))
    
    # Handle different types of notifications
    async def notification_message(self, event):
        """Handle notification messages"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'title': event['title'],
            'message': event['message'],
            'notification_type': event['notification_type'],
            'timestamp': event['timestamp'],
            'data': event.get('data', {})
        }))
    
    async def payment_notification(self, event):
        """Handle payment notifications"""
        await self.send(text_data=json.dumps({
            'type': 'payment_notification',
            'title': event['title'],
            'message': event['message'],
            'amount': event['amount'],
            'currency': event['currency'],
            'status': event['status'],
            'timestamp': event['timestamp']
        }))
    
    async def subscription_notification(self, event):
        """Handle subscription notifications"""
        await self.send(text_data=json.dumps({
            'type': 'subscription_notification',
            'title': event['title'],
            'message': event['message'],
            'plan_name': event['plan_name'],
            'status': event['status'],
            'timestamp': event['timestamp']
        }))
    
    async def system_notification(self, event):
        """Handle system notifications"""
        await self.send(text_data=json.dumps({
            'type': 'system_notification',
            'title': event['title'],
            'message': event['message'],
            'priority': event.get('priority', 'normal'),
            'timestamp': event['timestamp']
        }))

class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time chat"""
    
    async def connect(self):
        """Handle WebSocket connection for chat"""
        self.user = self.scope["user"]
        self.tenant = self.scope.get("tenant")
        
        if self.user.is_authenticated:
            # Create room group for building chat
            self.room_group_name = f"building_{self.tenant.id}_chat" if self.tenant else "public_chat"
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Send welcome message
            await self.send(text_data=json.dumps({
                'type': 'chat_connected',
                'message': f'Connected to {self.tenant.name if self.tenant else "public"} chat',
                'user_id': self.user.id,
                'user_name': self.user.name
            }))
            
            logger.info(f"User {self.user.email} connected to chat")
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection for chat"""
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"User {self.user.email if self.user.is_authenticated else 'Anonymous'} disconnected from chat")
    
    async def receive(self, text_data):
        """Handle received chat messages"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'chat_message':
                message = text_data_json.get('message', '')
                await self.send_chat_message(message)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def send_chat_message(self, message):
        """Send chat message to room group"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'user_id': self.user.id,
                'user_name': self.user.name,
                'message': message,
                'timestamp': text_data_json.get('timestamp')
            }
        )
    
    async def chat_message(self, event):
        """Handle chat messages"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'message': event['message'],
            'timestamp': event['timestamp']
        }))

class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time dashboard updates"""
    
    async def connect(self):
        """Handle WebSocket connection for dashboard"""
        self.user = self.scope["user"]
        self.tenant = self.scope.get("tenant")
        
        if self.user.is_authenticated:
            # Create room group for dashboard updates
            self.room_group_name = f"dashboard_{self.tenant.id}" if self.tenant else "dashboard_public"
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # Send initial dashboard data
            await self.send_dashboard_data()
            
            logger.info(f"User {self.user.email} connected to dashboard updates")
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection for dashboard"""
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"User {self.user.email if self.user.is_authenticated else 'Anonymous'} disconnected from dashboard")
    
    async def send_dashboard_data(self):
        """Send initial dashboard data"""
        # This would fetch real dashboard data
        dashboard_data = {
            'type': 'dashboard_data',
            'stats': {
                'apartments': 0,
                'users': 0,
                'maintenance': 0,
                'documents': 0
            },
            'recent_activity': [],
            'subscription_status': 'active'
        }
        
        await self.send(text_data=json.dumps(dashboard_data))
    
    async def dashboard_update(self, event):
        """Handle dashboard updates"""
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': event['data'],
            'timestamp': event['timestamp']
        }))
    
    async def stats_update(self, event):
        """Handle statistics updates"""
        await self.send(text_data=json.dumps({
            'type': 'stats_update',
            'stats': event['stats'],
            'timestamp': event['timestamp']
        }))
