"""
Django signals for automatic notification sending on new events.

This module handles automatic notifications when:
- New announcements are created
- New polls/assemblies are created  
- New requests are submitted

The notifications are sent based on settings configured in the UI.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger(__name__)


class EventNotificationService:
    """
    Service for sending automatic notifications on new events.
    """
    
    # Default settings (can be overridden via API/database)
    DEFAULT_SETTINGS = {
        'announcements': {
            'enabled': True,
            'channels': ['email'],
        },
        'polls': {
            'enabled': True,
            'channels': ['email'],
        },
        'requests': {
            'enabled': False,
            'channels': ['email'],
        },
    }
    
    @classmethod
    def get_settings(cls, building_id: int = None):
        """
        Get event notification settings.
        
        In the future, this can be stored in the database per building.
        For now, returns defaults.
        """
        # TODO: Fetch from database (EventNotificationSettings model)
        return cls.DEFAULT_SETTINGS
    
    @classmethod
    def send_announcement_notification(cls, announcement):
        """
        Send notification for a new announcement.
        """
        from .services import NotificationService
        from apartments.models import Apartment
        
        settings_data = cls.get_settings(announcement.building_id if hasattr(announcement, 'building_id') else None)
        
        if not settings_data['announcements']['enabled']:
            logger.info(f"Announcement notifications disabled, skipping for {announcement.id}")
            return
        
        channels = settings_data['announcements']['channels']
        
        if not channels:
            logger.info(f"No channels configured for announcements, skipping")
            return
        
        # Build notification message
        subject = f"📢 Νέα Ανακοίνωση: {announcement.title}"
        
        # Truncate description for preview
        description = announcement.description or ''
        if len(description) > 200:
            description = description[:200] + '...'
        
        body = f"""Αγαπητοί ένοικοι,

Δημοσιεύθηκε νέα ανακοίνωση στο κτίριό σας:

📌 {announcement.title}

{description}

👉 Δείτε λεπτομέρειες στην εφαρμογή σας

---
Αυτόματη ειδοποίηση από το New Concierge
"""
        
        html_body = cls._generate_event_html(
            event_type='announcement',
            title=announcement.title,
            description=description,
            icon='📢',
            color='#3b82f6',
        )
        
        try:
            # Get building
            building = announcement.building if hasattr(announcement, 'building') else None
            
            if not building:
                logger.warning(f"No building for announcement {announcement.id}")
                return
            
            # Create notification
            notification = NotificationService.create_notification(
                building=building,
                created_by=announcement.created_by if hasattr(announcement, 'created_by') else None,
                subject=subject,
                body=body,
                notification_type='all',  # Send to all channels (email, push, etc.)
                priority='normal',
            )
            
            # Add all recipients
            NotificationService.add_recipients(
                notification=notification,
                send_to_all=True,
            )
            
            # Send via celery task
            from .tasks import send_notification_task
            send_notification_task.delay(notification.id, None)
            
            logger.info(f"Sent announcement notification for {announcement.id} to {notification.total_recipients} recipients")
            
        except Exception as e:
            logger.error(f"Error sending announcement notification: {e}")
    
    @classmethod
    def send_poll_notification(cls, poll):
        """
        Send notification for a new poll/assembly.
        """
        from .services import NotificationService
        
        settings_data = cls.get_settings(poll.building_id if hasattr(poll, 'building_id') else None)
        
        if not settings_data['polls']['enabled']:
            logger.info(f"Poll notifications disabled, skipping for {poll.id}")
            return
        
        channels = settings_data['polls']['channels']
        
        if not channels:
            logger.info(f"No channels configured for polls, skipping")
            return
        
        # Build notification message
        title = getattr(poll, 'title', None) or getattr(poll, 'question', 'Νέα Ψηφοφορία')
        subject = f"🗳️ Νέα Ψηφοφορία: {title}"
        
        description = getattr(poll, 'description', '') or ''
        if len(description) > 200:
            description = description[:200] + '...'
        
        end_date = ''
        if hasattr(poll, 'end_date') and poll.end_date:
            end_date = f"\n⏰ Λήξη: {poll.end_date.strftime('%d/%m/%Y %H:%M')}"
        
        body = f"""Αγαπητοί ένοικοι,

Δημιουργήθηκε νέα ψηφοφορία στο κτίριό σας:

🗳️ {title}

{description}{end_date}

Η συμμετοχή σας είναι σημαντική!

👉 Ψηφίστε μέσω της εφαρμογής σας

---
Αυτόματη ειδοποίηση από το New Concierge
"""
        
        try:
            building = poll.building if hasattr(poll, 'building') else None
            
            if not building:
                logger.warning(f"No building for poll {poll.id}")
                return
            
            notification = NotificationService.create_notification(
                building=building,
                created_by=poll.created_by if hasattr(poll, 'created_by') else None,
                subject=subject,
                body=body,
                notification_type='email',
                priority='high',  # Polls are higher priority
            )
            
            NotificationService.add_recipients(
                notification=notification,
                send_to_all=True,
            )
            
            from .tasks import send_notification_task
            send_notification_task.delay(notification.id, None)
            
            logger.info(f"Sent poll notification for {poll.id}")
            
        except Exception as e:
            logger.error(f"Error sending poll notification: {e}")
    
    @classmethod
    def send_request_notification(cls, request_obj):
        """
        Send notification for a new request (to managers only).
        """
        from .services import NotificationService
        
        settings_data = cls.get_settings(request_obj.building_id if hasattr(request_obj, 'building_id') else None)
        
        if not settings_data['requests']['enabled']:
            logger.info(f"Request notifications disabled, skipping")
            return
        
        # For requests, only notify managers
        subject = f"📝 Νέο Αίτημα: {request_obj.title if hasattr(request_obj, 'title') else 'Αίτημα Ενοίκου'}"
        
        body = f"""Υποβλήθηκε νέο αίτημα:

📝 {request_obj.title if hasattr(request_obj, 'title') else 'Αίτημα'}

{request_obj.description if hasattr(request_obj, 'description') else ''}

👉 Δείτε και απαντήστε μέσω της εφαρμογής

---
Αυτόματη ειδοποίηση από το New Concierge
"""
        
        try:
            building = request_obj.building if hasattr(request_obj, 'building') else None
            
            if not building:
                return
            
            # Get managers for this building
            from buildings.models import BuildingMembership
            managers = BuildingMembership.objects.filter(
                building=building,
                role__in=['admin', 'manager']
            ).select_related('user')
            
            if not managers.exists():
                return
            
            notification = NotificationService.create_notification(
                building=building,
                created_by=None,
                subject=subject,
                body=body,
                notification_type='email',
                priority='normal',
            )
            
            # Add only managers as recipients
            from .models import NotificationRecipient
            for membership in managers:
                if membership.user.email:
                    NotificationRecipient.objects.create(
                        notification=notification,
                        email=membership.user.email,
                        name=membership.user.get_full_name() or membership.user.email,
                        status='pending'
                    )
            
            notification.total_recipients = managers.count()
            notification.save()
            
            from .tasks import send_notification_task
            send_notification_task.delay(notification.id, None)
            
            logger.info(f"Sent request notification to {managers.count()} managers")
            
        except Exception as e:
            logger.error(f"Error sending request notification: {e}")
    
    @staticmethod
    def _generate_event_html(event_type: str, title: str, description: str, icon: str, color: str) -> str:
        """Generate HTML for event notification email."""
        return f"""
        <!DOCTYPE html>
        <html lang="el">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, {color} 0%, {color}dd 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">{icon}</span>
                <h1 style="color: white; margin: 12px 0 0; font-size: 20px;">{title}</h1>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #475569;">{description}</p>
            </div>
            
            <div style="text-align: center; padding: 20px;">
                <a href="#" style="display: inline-block; background: {color}; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    👉 Δείτε λεπτομέρειες στην εφαρμογή σας
                </a>
            </div>
            
            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
                <p>Αυτόματη ειδοποίηση από το New Concierge</p>
            </div>
        </body>
        </html>
        """


# Django Signals
# These connect to the models and trigger notifications automatically

def register_event_signals():
    """
    Register all event signals.
    Called from apps.py ready() method.
    """
    try:
        # Try to import and connect announcement signals
        from announcements.models import Announcement
        
        @receiver(post_save, sender=Announcement)
        def on_announcement_created(sender, instance, created, **kwargs):
            if created and instance.is_active:
                logger.info(f"New announcement created: {instance.id}")
                EventNotificationService.send_announcement_notification(instance)
        
        logger.info("Registered announcement notification signal")
    except ImportError:
        logger.debug("Announcements app not available, skipping signal")
    
    try:
        # Try to import and connect poll signals
        from polls.models import Poll
        
        @receiver(post_save, sender=Poll)
        def on_poll_created(sender, instance, created, **kwargs):
            if created and getattr(instance, 'is_active', True):
                logger.info(f"New poll created: {instance.id}")
                EventNotificationService.send_poll_notification(instance)
        
        logger.info("Registered poll notification signal")
    except ImportError:
        logger.debug("Polls app not available, skipping signal")
    
    try:
        # Try to import and connect request signals
        from requests_app.models import Request  # Adjust model name as needed
        
        @receiver(post_save, sender=Request)
        def on_request_created(sender, instance, created, **kwargs):
            if created:
                logger.info(f"New request created: {instance.id}")
                EventNotificationService.send_request_notification(instance)
        
        logger.info("Registered request notification signal")
    except ImportError:
        logger.debug("Requests app not available, skipping signal")

