"""
Django signals for Google Calendar integration
Handles automatic synchronization of events when they are created/updated/deleted
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

from events.models import Event
from maintenance.models import MaintenanceTicket
from announcements.models import Announcement
from .google_calendar import GoogleCalendarService
from buildings.models import Building

logger = logging.getLogger(__name__)

def get_building_from_event(sender, instance, **kwargs):
    """
    Extract building from various event types
    """
    if hasattr(instance, 'building'):
        return instance.building
    elif hasattr(instance, 'building_id'):
        return Building.objects.filter(id=instance.building_id).first()
    elif sender == Event and hasattr(instance, 'building'):
        return instance.building
    return None

def should_sync_to_google(building):
    """
    Check if the building has Google Calendar enabled and configured
    """
    if not building:
        return False
        
    return (
        getattr(building, 'google_calendar_enabled', False) and
        getattr(building, 'google_calendar_id', None) and
        hasattr(settings, 'GOOGLE_CALENDAR_CREDENTIALS_FILE')
    )

def create_google_event_data(instance, event_type='other'):
    """
    Create Google Calendar event data from various model instances
    """
    title = getattr(instance, 'title', '') or getattr(instance, 'subject', '') or str(instance)
    description = getattr(instance, 'description', '') or getattr(instance, 'message', '')
    
    # Determine start and end times
    start_time = None
    end_time = None
    
    if hasattr(instance, 'scheduled_date') and instance.scheduled_date:
        start_time = instance.scheduled_date
    elif hasattr(instance, 'due_date') and instance.due_date:
        start_time = instance.due_date
    elif hasattr(instance, 'created_at'):
        start_time = instance.created_at
    
    # For maintenance requests, add duration if available
    if hasattr(instance, 'estimated_duration') and instance.estimated_duration:
        if start_time:
            end_time = start_time + instance.estimated_duration
    
    # Add location information
    location = ''
    if hasattr(instance, 'location') and instance.location:
        location = instance.location
    elif hasattr(instance, 'building') and instance.building:
        location = f"{instance.building.name}, {instance.building.address}"
    
    # Event type specific formatting
    type_prefixes = {
        'maintenance': '🔧',
        'meeting': '👥', 
        'announcement': '📢',
        'deadline': '💰',
        'other': '📅'
    }
    
    event_data = {
        'summary': f"{type_prefixes.get(event_type, '📅')} {title}",
        'description': description,
        'location': location,
        'start': {'dateTime': start_time.isoformat() if start_time else timezone.now().isoformat()},
        'end': {'dateTime': end_time.isoformat() if end_time else (start_time or timezone.now()).isoformat()},
    }
    
    # Add all-day event support for deadlines
    if event_type == 'deadline' and hasattr(instance, 'due_date') and instance.due_date:
        date_str = instance.due_date.date().isoformat()
        event_data['start'] = {'date': date_str}
        event_data['end'] = {'date': date_str}
    
    return event_data

@receiver(post_save, sender=Event)
def sync_event_to_google_calendar(sender, instance, created, **kwargs):
    """
    Sync Event model changes to Google Calendar
    """
    building = get_building_from_event(sender, instance, **kwargs)
    
    if not should_sync_to_google(building):
        logger.debug(f"Skipping Google Calendar sync for event {instance.id} - not configured")
        return
    
    try:
        service = GoogleCalendarService()
        
        # Determine event type from instance
        event_type = getattr(instance, 'event_type', 'other')
        if hasattr(instance, 'event_type'):
            type_mapping = {
                'maintenance': 'maintenance',
                'repair': 'maintenance', 
                'meeting': 'meeting',
                'assembly': 'meeting',
                'announcement': 'announcement',
                'payment': 'deadline',
                'deadline': 'deadline'
            }
            event_type = type_mapping.get(event_type.lower(), 'other')
        
        event_data = create_google_event_data(instance, event_type)
        
        if created or not getattr(instance, 'google_event_id', None):
            # Create new Google Calendar event
            google_event_id = service.sync_event_to_google(
                event_data, 
                building.google_calendar_id
            )
            
            if google_event_id:
                # Save Google event ID back to instance
                instance.google_event_id = google_event_id
                Event.objects.filter(id=instance.id).update(google_event_id=google_event_id)
                logger.info(f"Created Google Calendar event {google_event_id} for event {instance.id}")
        else:
            # Update existing Google Calendar event
            success = service.update_google_event(
                instance.google_event_id,
                event_data,
                building.google_calendar_id
            )
            
            if success:
                logger.info(f"Updated Google Calendar event {instance.google_event_id} for event {instance.id}")
            else:
                logger.warning(f"Failed to update Google Calendar event {instance.google_event_id} for event {instance.id}")
                
    except Exception as e:
        logger.error(f"Failed to sync event {instance.id} to Google Calendar: {str(e)}")

@receiver(pre_delete, sender=Event)
def delete_event_from_google_calendar(sender, instance, **kwargs):
    """
    Delete event from Google Calendar when Event is deleted
    """
    building = get_building_from_event(sender, instance, **kwargs)
    
    if not should_sync_to_google(building) or not getattr(instance, 'google_event_id', None):
        return
    
    try:
        service = GoogleCalendarService()
        success = service.delete_google_event(
            instance.google_event_id,
            building.google_calendar_id
        )
        
        if success:
            logger.info(f"Deleted Google Calendar event {instance.google_event_id} for event {instance.id}")
        else:
            logger.warning(f"Failed to delete Google Calendar event {instance.google_event_id} for event {instance.id}")
            
    except Exception as e:
        logger.error(f"Failed to delete event {instance.id} from Google Calendar: {str(e)}")

@receiver(post_save, sender=MaintenanceTicket) 
def sync_maintenance_to_google_calendar(sender, instance, created, **kwargs):
    """
    Sync MaintenanceTicket changes to Google Calendar
    """
    building = get_building_from_event(sender, instance, **kwargs)
    
    if not should_sync_to_google(building):
        return
    
    try:
        service = GoogleCalendarService()
        event_data = create_google_event_data(instance, 'maintenance')
        
        # Add maintenance specific information
        event_data['summary'] = f"🔧 Συντήρηση: {instance.title}"
        
        priority_colors = {
            'urgent': '11',  # Red
            'high': '6',     # Orange  
            'medium': '1',   # Blue
            'low': '2'       # Green
        }
        
        if hasattr(instance, 'priority'):
            event_data['colorId'] = priority_colors.get(instance.priority.lower(), '1')
        
        if created or not getattr(instance, 'google_event_id', None):
            google_event_id = service.sync_event_to_google(
                event_data,
                building.google_calendar_id
            )
            
            if google_event_id:
                MaintenanceTicket.objects.filter(id=instance.id).update(google_event_id=google_event_id)
                logger.info(f"Created Google Calendar event {google_event_id} for maintenance {instance.id}")
        else:
            success = service.update_google_event(
                instance.google_event_id,
                event_data, 
                building.google_calendar_id
            )
            
            if success:
                logger.info(f"Updated Google Calendar event {instance.google_event_id} for maintenance {instance.id}")
                
    except Exception as e:
        logger.error(f"Failed to sync maintenance {instance.id} to Google Calendar: {str(e)}")

@receiver(post_save, sender=Announcement)
def sync_announcement_to_google_calendar(sender, instance, created, **kwargs):
    """
    Sync important announcements to Google Calendar
    """
    building = get_building_from_event(sender, instance, **kwargs)
    
    if not should_sync_to_google(building):
        return
    
    # Only sync announcements that have dates or are marked as important
    if not (hasattr(instance, 'event_date') and instance.event_date) and not getattr(instance, 'is_important', False):
        return
    
    try:
        service = GoogleCalendarService()
        event_data = create_google_event_data(instance, 'announcement')
        
        # Use event_date if available, otherwise created_at
        if hasattr(instance, 'event_date') and instance.event_date:
            event_data['start'] = {'date': instance.event_date.date().isoformat()}
            event_data['end'] = {'date': instance.event_date.date().isoformat()}
        
        event_data['summary'] = f"📢 Ανακοίνωση: {instance.title}"
        event_data['colorId'] = '5'  # Yellow for announcements
        
        if created or not getattr(instance, 'google_event_id', None):
            google_event_id = service.sync_event_to_google(
                event_data,
                building.google_calendar_id
            )
            
            if google_event_id:
                Announcement.objects.filter(id=instance.id).update(google_event_id=google_event_id)
                logger.info(f"Created Google Calendar event {google_event_id} for announcement {instance.id}")
                
    except Exception as e:
        logger.error(f"Failed to sync announcement {instance.id} to Google Calendar: {str(e)}")

# Common expense deadline sync (if you have a model for this)
"""
@receiver(post_save, sender=CommonExpenseDeadline)
def sync_deadline_to_google_calendar(sender, instance, created, **kwargs):
    building = get_building_from_event(sender, instance, **kwargs)
    
    if not should_sync_to_google(building):
        return
    
    try:
        service = GoogleCalendarService()
        event_data = create_google_event_data(instance, 'deadline')
        
        event_data['summary'] = f"💰 Προθεσμία: {instance.description}"
        event_data['colorId'] = '11'  # Red for deadlines
        
        # Make it an all-day event
        if hasattr(instance, 'due_date') and instance.due_date:
            date_str = instance.due_date.date().isoformat()
            event_data['start'] = {'date': date_str}
            event_data['end'] = {'date': date_str}
        
        if created or not getattr(instance, 'google_event_id', None):
            google_event_id = service.sync_event_to_google(
                event_data,
                building.google_calendar_id
            )
            
            if google_event_id:
                CommonExpenseDeadline.objects.filter(id=instance.id).update(google_event_id=google_event_id)
                logger.info(f"Created Google Calendar event {google_event_id} for deadline {instance.id}")
                
    except Exception as e:
        logger.error(f"Failed to sync deadline {instance.id} to Google Calendar: {str(e)}")
"""