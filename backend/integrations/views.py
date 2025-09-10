"""
Google Calendar Integration API Views
"""

import json
import logging
from django.conf import settings
from django.http import JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django_tenants.utils import schema_context
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.errors import HttpError

from buildings.models import Building
from events.models import Event
from .google_calendar import GoogleCalendarService, get_admin_calendar_service

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_google_calendar(request):
    """
    Initiate Google Calendar OAuth flow for a building
    """
    building_id = request.data.get('building_id')
    redirect_uri = request.data.get('redirect_uri', request.META.get('HTTP_REFERER', '/'))
    
    if not building_id:
        return Response({'error': 'Building ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    with schema_context('demo'):
        try:
            building = get_object_or_404(Building, id=building_id)
            
            # Create OAuth flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                    }
                },
                scopes=settings.GOOGLE_CALENDAR_SCOPES
            )
            flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
            
            # Generate authorization URL
            authorization_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                prompt='consent',
                state=json.dumps({
                    'building_id': building_id,
                    'redirect_uri': redirect_uri,
                    'user_id': request.user.id
                })
            )
            
            # Store state in session
            request.session['oauth_state'] = state
            
            return Response({
                'authorization_url': authorization_url,
                'state': state
            })
            
        except Exception as e:
            logger.error(f"Failed to initiate Google OAuth flow: {e}")
            return Response({'error': 'Failed to initiate OAuth flow'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def google_oauth_callback(request):
    """
    Handle Google OAuth callback
    """
    code = request.GET.get('code')
    state = request.GET.get('state')
    error = request.GET.get('error')
    
    if error:
        logger.error(f"Google OAuth error: {error}")
        return HttpResponseRedirect(f"/admin/calendar?error={error}")
    
    if not code or not state:
        return HttpResponseRedirect("/admin/calendar?error=missing_parameters")
    
    try:
        # Parse state
        state_data = json.loads(state)
        building_id = state_data.get('building_id')
        redirect_uri = state_data.get('redirect_uri', '/admin/calendar')
        user_id = state_data.get('user_id')
        
        if not building_id:
            return HttpResponseRedirect("/admin/calendar?error=invalid_state")
        
        with schema_context('demo'):
            building = get_object_or_404(Building, id=building_id)
            
            # Exchange code for tokens
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                    }
                },
                scopes=settings.GOOGLE_CALENDAR_SCOPES
            )
            flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
            
            # Fetch tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Create calendar service with admin credentials
            service = GoogleCalendarService(credentials)
            
            # Create building calendar
            calendar_result = service.create_building_calendar(building.name, building.id)
            
            # Update building record
            building.google_calendar_id = calendar_result['id']
            building.google_calendar_enabled = True
            building.save()
            
            # Store credentials (in production, store encrypted in database)
            # For now, we'll just log success
            logger.info(f"Successfully connected Google Calendar for building {building.name}")
            
            return HttpResponseRedirect(f"{redirect_uri}?success=calendar_connected")
            
    except Exception as e:
        logger.error(f"Failed to complete Google OAuth flow: {e}")
        return HttpResponseRedirect("/admin/calendar?error=oauth_failed")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_google_calendar(request):
    """
    Disconnect Google Calendar for a building
    """
    building_id = request.data.get('building_id')
    
    if not building_id:
        return Response({'error': 'Building ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    with schema_context('demo'):
        try:
            building = get_object_or_404(Building, id=building_id)
            
            # Clear Google Calendar data
            building.google_calendar_id = None
            building.google_calendar_enabled = False
            building.save()
            
            # Clear Google event IDs from events
            Event.objects.filter(building=building).update(
                google_event_id=None,
                last_google_sync=None
            )
            
            logger.info(f"Successfully disconnected Google Calendar for building {building.name}")
            
            return Response({'message': 'Google Calendar disconnected successfully'})
            
        except Exception as e:
            logger.error(f"Failed to disconnect Google Calendar: {e}")
            return Response({'error': 'Failed to disconnect calendar'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_status(request):
    """
    Get Google Calendar status for buildings
    """
    building_id = request.GET.get('building_id')
    
    with schema_context('demo'):
        try:
            if building_id:
                building = get_object_or_404(Building, id=building_id)
                buildings = [building]
            else:
                buildings = Building.objects.all()
            
            status_data = []
            
            for building in buildings:
                events_count = Event.objects.filter(building=building).count()
                synced_events = Event.objects.filter(
                    building=building, 
                    google_event_id__isnull=False
                ).count()
                
                last_sync = Event.objects.filter(
                    building=building,
                    last_google_sync__isnull=False
                ).order_by('-last_google_sync').first()
                
                building_status = {
                    'building_id': building.id,
                    'building_name': building.name,
                    'google_calendar_enabled': building.google_calendar_enabled,
                    'google_calendar_id': building.google_calendar_id,
                    'calendar_url': building.get_google_calendar_url() if building.google_calendar_id else None,
                    'events_count': events_count,
                    'synced_events': synced_events,
                    'last_sync': last_sync.last_google_sync.isoformat() if last_sync and last_sync.last_google_sync else None,
                }
                
                status_data.append(building_status)
            
            if building_id:
                return Response(status_data[0] if status_data else {})
            else:
                return Response({'buildings': status_data})
                
        except Exception as e:
            logger.error(f"Failed to get calendar status: {e}")
            return Response({'error': 'Failed to get calendar status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_calendar(request):
    """
    Manual sync of events to Google Calendar
    """
    building_id = request.data.get('building_id')
    
    if not building_id:
        return Response({'error': 'Building ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    with schema_context('demo'):
        try:
            building = get_object_or_404(Building, id=building_id)
            
            if not building.google_calendar_enabled or not building.google_calendar_id:
                return Response({'error': 'Google Calendar not connected for this building'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Get admin calendar service
            service = get_admin_calendar_service()
            if not service:
                return Response({'error': 'Google Calendar service not available'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Sync events
            events = Event.objects.filter(
                building=building,
                google_sync_enabled=True
            )
            
            synced_count = 0
            error_count = 0
            
            for event in events:
                try:
                    google_event_id = service.sync_event_to_google(event, building.google_calendar_id)
                    if google_event_id:
                        event.google_event_id = google_event_id
                        event.last_google_sync = timezone.now()
                        event.save()
                        synced_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    logger.error(f"Failed to sync event {event.id}: {e}")
                    error_count += 1
            
            return Response({
                'message': f'Sync completed. {synced_count} events synced, {error_count} errors.',
                'synced_count': synced_count,
                'error_count': error_count
            })
            
        except Exception as e:
            logger.error(f"Failed to sync calendar: {e}")
            return Response({'error': 'Failed to sync calendar'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_connection(request):
    """
    Test Google Calendar API connection
    """
    try:
        service = get_admin_calendar_service()
        
        if not service:
            return Response({'connected': False, 'error': 'Service not available'})
        
        connected = service.test_connection()
        
        return Response({
            'connected': connected,
            'message': 'Connection successful' if connected else 'Connection failed'
        })
        
    except Exception as e:
        logger.error(f"Failed to test connection: {e}")
        return Response({'connected': False, 'error': str(e)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_sync_settings(request):
    """
    Update sync settings for a building
    """
    building_id = request.data.get('building_id')
    settings_data = request.data.get('settings', {})
    
    if not building_id:
        return Response({'error': 'Building ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    with schema_context('demo'):
        try:
            building = get_object_or_404(Building, id=building_id)
            
            # Update building sync settings
            building.google_calendar_sync_enabled = settings_data.get('auto_sync', True)
            building.save()
            
            # Update event type sync settings
            event_types = {
                'maintenance': settings_data.get('sync_maintenance', True),
                'meeting': settings_data.get('sync_meetings', True),
                'deadline': settings_data.get('sync_deadlines', True),
                'reminder': settings_data.get('sync_reminders', True),
            }
            
            for event_type, enabled in event_types.items():
                Event.objects.filter(
                    building=building,
                    event_type=event_type
                ).update(google_sync_enabled=enabled)
            
            return Response({'message': 'Sync settings updated successfully'})
            
        except Exception as e:
            logger.error(f"Failed to update sync settings: {e}")
            return Response({'error': 'Failed to update settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_sync_events(request):
    """
    Bulk sync all events for a building to Google Calendar
    """
    building_id = request.data.get('building_id')
    
    if not building_id:
        return Response({'error': 'Building ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    with schema_context('demo'):
        try:
            building = get_object_or_404(Building, id=building_id)
            
            if not building.google_calendar_enabled or not building.google_calendar_id:
                return Response({'error': 'Google Calendar not connected for this building'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            # Get admin calendar service
            service = get_admin_calendar_service()
            if not service:
                return Response({'error': 'Google Calendar service not available'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            synced_count = 0
            error_count = 0
            
            # Sync all events for the building
            events = Event.objects.filter(building=building)
            
            for event in events:
                try:
                    google_event_id = service.sync_event_to_google(event, building.google_calendar_id)
                    if google_event_id:
                        event.google_event_id = google_event_id
                        event.last_google_sync = timezone.now()
                        event.save()
                        synced_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    logger.error(f"Failed to sync event {event.id}: {e}")
                    error_count += 1
            
            return Response({
                'message': f'Bulk sync completed: {synced_count} events synced, {error_count} errors',
                'synced_count': synced_count,
                'error_count': error_count
            })
            
        except Exception as e:
            logger.error(f"Bulk sync failed: {e}")
            return Response({'error': f'Bulk sync failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)