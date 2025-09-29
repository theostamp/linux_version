"""
URLs for Google Calendar Integration
"""

from django.urls import path
from . import views

urlpatterns = [
    # OAuth Flow
    path('google-calendar/connect/', views.connect_google_calendar, name='connect_google_calendar'),
    path('auth/google/callback/', views.google_oauth_callback, name='google_oauth_callback'),
    
    # Calendar Management
    path('google-calendar/disconnect/', views.disconnect_google_calendar, name='disconnect_google_calendar'),
    path('google-calendar/status/', views.calendar_status, name='calendar_status'),
    path('google-calendar/sync/', views.sync_calendar, name='sync_calendar'),
    path('google-calendar/bulk-sync/', views.bulk_sync_events, name='bulk_sync_events'),
    path('google-calendar/test/', views.test_connection, name='test_connection'),
    path('google-calendar/settings/', views.update_sync_settings, name='update_sync_settings'),
]