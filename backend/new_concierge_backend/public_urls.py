from django.contrib import admin
from django.urls import path, include, re_path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from django.http import HttpResponse
from django.shortcuts import redirect
from core.media_views import serve_media


# Public home view removed - now handled by Public App (Next.js)
# def home(request):
#     return HttpResponse("""
#     <h1>Django Tenants Project</h1>
#     <p>Welcome to the public tenant!</p>
#     <ul>
#         <li><a href="/admin/">Admin Panel</a></li>
#         <li><a href="/api/">API</a></li>
#     </ul>
#     """)

# Public tenant URL configuration (shared across all tenants)
urlpatterns = [
    # Admin panel (μόνο για public tenant)
    path('admin/', admin.site.urls),
    
    # Dev convenience: avoid confusing 404 on backend root.
    # In production the public root is handled by the Next.js app.
    path(
        '',
        lambda request: redirect(getattr(settings, "FRONTEND_URL", "/admin/"))
        if settings.DEBUG
        else HttpResponse(status=404),
        name='public-root',
    ),
    
    # Authentication & User endpoints (διαθέσιμο και στο public tenant)
    path('api/users/', include('users.urls')),
    
    # Public buildings endpoint (διαθέσιμο στο public tenant)
    path('api/buildings/public/', include('buildings.public_urls')),
    
    # Core endpoints (CSRF token) - διαθέσιμο στο public tenant
    path('api/', include('core.urls')),
    
    # Billing endpoints (shared across all tenants)
    path('api/billing/', include('billing.urls')),

    # Online payments webhooks (public schema)
    path('api/webhooks/', include('online_payments_public.urls')),
    # Ad Portal webhooks (public schema)
    path('api/webhooks/ad-portal/', include('ad_portal_public.urls')),

    # Automated Ad Portal (public schema)
    path('api/ad-portal/', include('ad_portal.urls')),
    
    # Office Staff Management (shared across all tenants)
    path('api/office/', include('office_staff.urls')),

    # Marketplace (public schema)
    path('api/marketplace/', include('marketplace_public.urls')),
    
    # Internal API endpoints (accessible from public schema only)
    path('api/internal/tenants/', include('tenants.internal_urls')),
    
    # Tenant accept invite endpoint
    path('api/tenants/accept-invite/', include('tenants.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
    # Serve media files in production using custom view (Django's static() returns [] when DEBUG=False)
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media, name='serve_media_public'),
    ]