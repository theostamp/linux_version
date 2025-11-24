from django.urls import path, include, re_path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from api import views as legacy_api_views
from api import kiosk_views as kiosk_bill_views
from core.media_views import serve_media

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
    path('api/apartments/', include('apartments.urls')),
    
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
    path('api/public-info/', legacy_api_views.public_info, name='public-info'),
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

    # Projects & Offers
    path('api/projects/', include('projects.urls')),

    # Todo management
    path('api/todos/', include('todo_management.urls')),
    
    # Events management
    path('api/events/', include('events.urls')),

    # Data migration
    path('api/data-migration/', include('data_migration.urls')),
    
    # Legacy kiosk utilities (base64 uploads for kiosk displays)
    path('api/kiosk/upload-bill/', kiosk_bill_views.upload_common_expense_bill, name='kiosk-upload-bill'),
    path('api/kiosk/latest-bill/', kiosk_bill_views.get_latest_common_expense_bill, name='kiosk-latest-bill'),
    path('api/kiosk/list-bills/', kiosk_bill_views.list_common_expense_bills, name='kiosk-list-bills'),
    
    # Kiosk management
    path('api/kiosk/', include('kiosk.urls')),

    # Document parser
    path('api/parser/', include('document_parser.urls')),

    # Billing & Subscriptions
    path('api/billing/', include('billing.urls')),

    # Core endpoints (π.χ. CSRF token)
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
    # Serve media files in production using custom view (Django's static() returns [] when DEBUG=False)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media, name='serve_media_tenant'),
    ]