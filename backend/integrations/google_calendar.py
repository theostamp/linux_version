"""
Google Calendar Integration Service
New Concierge Building Management System

Handles all Google Calendar API operations for building event synchronization.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import json
import os

from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """Service for Google Calendar API operations"""
    
    def __init__(self, credentials=None):
        """
        Initialize Google Calendar service
        
        Args:
            credentials: Google OAuth2 credentials. If None, uses service account.
        """
        self.credentials = credentials or self._get_service_account_credentials()
        self.service = build('calendar', 'v3', credentials=self.credentials)
    
    @classmethod
    def _get_service_account_credentials(cls):
        """Get service account credentials from settings"""
        service_account_file = getattr(settings, 'GOOGLE_SERVICE_ACCOUNT_FILE', None)
        if not service_account_file or not os.path.exists(service_account_file):
            raise ValueError("Google service account file not found")
            
        return service_account.Credentials.from_service_account_file(
            service_account_file,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
    
    @classmethod
    def from_oauth_credentials(cls, access_token, refresh_token, client_id, client_secret):
        """Create service instance from OAuth credentials"""
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        return cls(credentials)
    
    def create_building_calendar(self, building_name: str, building_id: int) -> Dict:
        """
        Create a new calendar for a building
        
        Args:
            building_name: Name of the building
            building_id: Building ID from database
            
        Returns:
            Dictionary containing calendar information
        """
        calendar_body = {
            'summary': f'{building_name} - Διαχείριση Κτιρίου',
            'description': (
                f'Ημερολόγιο events και ανακοινώσεων για το κτίριο {building_name}. '
                f'Διαχειρίζεται από το New Concierge Building Management System.'
            ),
            'timeZone': 'Europe/Athens',
            'location': building_name
        }
        
        try:
            created_calendar = self.service.calendars().insert(body=calendar_body).execute()
            
            # Set calendar to be public readable but not editable
            self._set_calendar_public_readable(created_calendar['id'])
            
            logger.info(f"Created calendar for building {building_name}: {created_calendar['id']}")
            return created_calendar
            
        except HttpError as e:
            logger.error(f"Failed to create calendar for building {building_name}: {e}")
            raise
    
    def _set_calendar_public_readable(self, calendar_id: str):
        """Make calendar readable by anyone with the link"""
        try:
            rule = {
                'role': 'reader',
                'scope': {
                    'type': 'default'
                }
            }
            self.service.acl().insert(calendarId=calendar_id, body=rule).execute()
        except HttpError as e:
            logger.warning(f"Failed to make calendar {calendar_id} public readable: {e}")
    
    def share_calendar_with_user(self, calendar_id: str, user_email: str, role: str = 'reader') -> bool:
        """
        Share calendar with a specific user
        
        Args:
            calendar_id: Google Calendar ID
            user_email: Email address of user to share with
            role: 'reader' or 'writer' (default: 'reader')
            
        Returns:
            True if successful, False otherwise
        """
        rule = {
            'role': role,
            'scope': {
                'type': 'user',
                'value': user_email
            }
        }
        
        try:
            result = self.service.acl().insert(calendarId=calendar_id, body=rule).execute()
            logger.info(f"Shared calendar {calendar_id} with {user_email} as {role}")
            return True
            
        except HttpError as e:
            if e.resp.status == 409:
                logger.info(f"User {user_email} already has access to calendar {calendar_id}")
                return True
            else:
                logger.error(f"Failed to share calendar {calendar_id} with {user_email}: {e}")
                return False
    
    def sync_event_to_google(self, event, calendar_id: str) -> Optional[str]:
        """
        Sync a New Concierge event to Google Calendar
        
        Args:
            event: Event model instance
            calendar_id: Google Calendar ID
            
        Returns:
            Google event ID if successful, None otherwise
        """
        google_event = self._build_google_event_from_event(event)
        
        try:
            if event.google_event_id:
                # Update existing event
                result = self.service.events().update(
                    calendarId=calendar_id,
                    eventId=event.google_event_id,
                    body=google_event
                ).execute()
                logger.info(f"Updated Google event {event.google_event_id} for event {event.id}")
            else:
                # Create new event
                result = self.service.events().insert(
                    calendarId=calendar_id,
                    body=google_event
                ).execute()
                logger.info(f"Created Google event {result['id']} for event {event.id}")
            
            return result['id']
            
        except HttpError as e:
            logger.error(f"Failed to sync event {event.id} to Google Calendar: {e}")
            return None
    
    def delete_google_event(self, calendar_id: str, google_event_id: str) -> bool:
        """
        Delete an event from Google Calendar
        
        Args:
            calendar_id: Google Calendar ID
            google_event_id: Google event ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.service.events().delete(
                calendarId=calendar_id,
                eventId=google_event_id
            ).execute()
            logger.info(f"Deleted Google event {google_event_id}")
            return True
            
        except HttpError as e:
            if e.resp.status == 410:  # Event already deleted
                logger.info(f"Google event {google_event_id} was already deleted")
                return True
            else:
                logger.error(f"Failed to delete Google event {google_event_id}: {e}")
                return False
    
    def _build_google_event_from_event(self, event) -> Dict:
        """Build Google Calendar event structure from New Concierge event"""
        
        # Calculate end time (default to 1 hour if not specified)
        start_time = event.scheduled_date or timezone.now()
        end_time = start_time + timedelta(hours=1)
        
        # Event color based on type
        color_map = {
            'maintenance': '11',      # Red
            'meeting': '9',           # Blue  
            'deadline': '6',          # Orange
            'emergency': '11',        # Red
            'announcement': '2',      # Green
        }
        
        # Build description with links back to New Concierge
        description = self._format_event_description(event)
        
        google_event = {
            'summary': event.title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Europe/Athens'
            },
            'end': {
                'dateTime': end_time.isoformat(), 
                'timeZone': 'Europe/Athens'
            },
            'colorId': color_map.get(event.event_type, '7'),  # Default gray
            'location': getattr(event.building, 'address', ''),
            'extendedProperties': {
                'private': {
                    'new_concierge_event_id': str(event.id),
                    'new_concierge_building_id': str(event.building_id),
                    'new_concierge_event_type': event.event_type,
                }
            }
        }
        
        # Add reminders for important events
        if event.event_type in ['deadline', 'emergency', 'meeting']:
            google_event['reminders'] = {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 60},       # 1 hour before
                ]
            }
        
        return google_event
    
    def _format_event_description(self, event) -> str:
        """Format event description with links and details"""
        
        base_url = getattr(settings, 'FRONTEND_URL', 'http://demo.localhost:3001')
        
        description_parts = []
        
        # Original description
        if event.description:
            description_parts.append(event.description)
            description_parts.append('')
        
        # Event details
        details = []
        details.append(f"🏢 **Κτίριο**: {event.building.name}")
        details.append(f"📋 **Τύπος**: {event.get_event_type_display()}")
        details.append(f"⚡ **Προτεραιότητα**: {event.get_priority_display()}")
        details.append(f"📊 **Κατάσταση**: {event.get_status_display()}")
        
        if event.due_date:
            details.append(f"⏰ **Καταληκτική**: {event.due_date.strftime('%d/%m/%Y %H:%M')}")
        
        if event.contact_phone:
            details.append(f"📞 **Τηλέφωνο**: {event.contact_phone}")
            
        if event.contact_email:
            details.append(f"📧 **Email**: {event.contact_email}")
        
        description_parts.extend(details)
        description_parts.append('')
        
        # Links back to New Concierge
        links = [
            "🔗 **Ενέργειες:**",
            f"• [Προβολή στο New Concierge]({base_url}/events/{event.id})",
            f"• [Dashboard κτιρίου]({base_url}/buildings/{event.building_id})",
        ]
        
        if event.event_type == 'maintenance':
            links.append(f"• [Maintenance Details]({base_url}/maintenance)")
            
        description_parts.extend(links)
        description_parts.append('')
        description_parts.append("---")
        description_parts.append("📱 *Δημιουργήθηκε από το New Concierge Building Management System*")
        
        return '\n'.join(description_parts)
    
    def get_calendar_embed_url(self, calendar_id: str) -> str:
        """Get embeddable Google Calendar URL"""
        return f"https://calendar.google.com/calendar/embed?src={calendar_id}&ctz=Europe/Athens"
    
    def get_calendar_public_url(self, calendar_id: str) -> str:
        """Get public Google Calendar URL"""  
        return f"https://calendar.google.com/calendar/u/0?cid={calendar_id}"
    
    def test_connection(self) -> bool:
        """Test if Google Calendar API connection is working"""
        try:
            # Try to list calendars
            result = self.service.calendarList().list(maxResults=1).execute()
            logger.info("Google Calendar API connection test successful")
            return True
        except Exception as e:
            logger.error(f"Google Calendar API connection test failed: {e}")
            return False


def get_admin_calendar_service() -> Optional[GoogleCalendarService]:
    """
    Get Google Calendar service instance using admin credentials
    
    Returns:
        GoogleCalendarService instance or None if not configured
    """
    try:
        return GoogleCalendarService()
    except Exception as e:
        logger.error(f"Failed to initialize Google Calendar service: {e}")
        return None