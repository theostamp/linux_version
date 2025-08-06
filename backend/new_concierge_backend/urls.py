# This file should only contain tenant-specific URL routing
# Public tenant URLs are now in public_urls.py

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib import admin

# Tenant-specific URL configuration (automatically routed by django-tenants middleware)
urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # Authentication & User endpoints
    path('api/users/', include('users.urls')),

    # Building management
    path('api/buildings/', include('buildings.urls')),
    
    # Public buildings endpoint (for kiosk mode)
    path('api/buildings/public/', include('buildings.public_urls')),
    
    # Apartments management
    path('api/', include('apartments.urls')),
    
    # Announcements
    path('api/announcements/', include('announcements.urls')),
    
    # User requests
    path('api/user-requests/', include('user_requests.urls')),
    
    # Obligations
    path('api/obligations/', include('obligations.urls')),
    
    # Votes
    path('api/votes/', include('votes.urls')),
    
    # Financial management
    path('api/financial/', include('financial.urls')),
    
    # Public info
    path('api/public-info/', include('public_info.urls')),
    
    # Residents
    path('api/residents/', include('residents.urls')),

    # Chat
    path('api/chat/', include('chat.urls')),

    # Teams management
    path('api/teams/', include('teams.urls')),
    
    # Collaborators management
    path('api/collaborators/', include('collaborators.urls')),
    
    # Maintenance management
    path('api/maintenance/', include('maintenance.urls')),

    # Core endpoints (π.χ. CSRF token)
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
