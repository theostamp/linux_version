# This file should only contain tenant-specific URL routing
# Public tenant URLs are now in public_urls.py

from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import redirect
from core.media_views import serve_media
from health_check import HealthCheckView, ReadinessCheckView, LivenessCheckView

from api import views as legacy_api_views
from api import kiosk_views as kiosk_bill_views

# Tenant-specific URL configuration (automatically routed by django-tenants middleware)
urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Dev convenience: avoid confusing 404 on backend root.
    path(
        '',
        lambda request: redirect(getattr(settings, "FRONTEND_URL", "/admin/"))
        if settings.DEBUG
        else HttpResponse(status=404),
        name='tenant-root',
    ),

    # Health checks (production monitoring)
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('ready/', ReadinessCheckView.as_view(), name='readiness-check'),
    path('live/', LivenessCheckView.as_view(), name='liveness-check'),

    # Authentication & User endpoints
    path('api/users/', include('users.urls')),

    # Building management
    path('api/buildings/', include('buildings.urls')),

    # Public buildings endpoint (for kiosk mode)
    path('api/buildings/public/', include('buildings.public_urls')),

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

    # Collections OS
    path('api/collections/', include('collections_os.urls')),

    # Archive (Electronic Document Archive)
    path('api/archive/', include('archive.urls')),

    # Online payments (Stripe charges)
    path('api/online-payments/', include('online_payments.urls')),

    # Public info
    path('api/public-info/', legacy_api_views.public_info, name='public-info'),
    path('api/public-info/', include('public_info.urls')),

    # Automated Ad Portal (public schema-backed, exposed via tenant routing)
    path('api/ad-portal/', include('ad_portal.urls')),

    # Marketplace (public schema-backed, exposed via tenant routing)
    path('api/marketplace/', include('marketplace_public.urls')),

    # Tenants
    path('api/tenants/', include('tenants.urls')),

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

    # Document parser
    path('api/parser/', include('document_parser.urls')),

    # Integrations (Google Calendar, etc.)
    path('api/integrations/', include('integrations.urls')),

    # Kiosk widget management
    path('api/kiosk/', include('kiosk.urls')),

    # Notifications (Email/SMS)
    path('api/notifications/', include('notifications.urls')),
    path('api/ai/', include('ai_agent.urls')),  # 🤖 AI Agent Endpoints
    path('api/iot/', include('iot_heating.urls')),  # 🌡️ IoT Premium Endpoints

    # Billing & Subscriptions
    path('api/billing/', include('billing.urls')),

    # Admin endpoints
    path('api/admin/', include('admin.urls')),

    # Office Staff Management
    path('api/office/', include('office_staff.urls')),

    # Office Analytics (Command Center for Management Offices)
    path('api/office-analytics/', include('office_analytics.urls')),

    # Office Finance (Income/Expense Management for the Office)
    path('api/office-finance/', include('office_finance.urls')),

    # Office Ops (Bulk Center)
    path('api/office-ops/', include('office_ops.urls')),

    # Assemblies (Γενικές Συνελεύσεις)
    path('api/', include('assemblies.urls')),

    # Core endpoints (π.χ. CSRF token)
    path('api/', include('core.urls')),
]

# Temporarily disable debug_toolbar URLs
# if settings.DEBUG:
#     import debug_toolbar
#     urlpatterns = [
#         path('__debug__/', include(debug_toolbar.urls)),
#     ] + urlpatterns

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
    # Serve media files in production using custom view (Django's static() returns [] when DEBUG=False)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media, name='serve_media'),
    ]
