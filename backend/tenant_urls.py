from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

# Tenant URL configuration
urlpatterns = [
    # Admin panel removed from tenants - only accessible from public tenant
    
    # Authentication & User endpoints
    path('api/users/', include('users.urls')),

    # Public buildings endpoint (for kiosk mode) - must come before general buildings URLs
    path('api/buildings/public/', include('buildings.public_urls')),
    
    # Building management
    path('api/buildings/', include('buildings.urls')),
    
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