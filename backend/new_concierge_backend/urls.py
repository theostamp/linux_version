from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from django.http import HttpResponse


def home(request):
    return HttpResponse("""
    <h1>Django Tenants Project</h1>
    <p>Welcome to the public tenant!</p>
    <ul>
        <li><a href="/admin/">Admin Panel</a></li>
        <li><a href="/api/">API</a></li>
    </ul>
    """)

# Django Tenants URL configuration
urlpatterns = [
    # Admin panel (μόνο για public tenant)
    path('admin/', admin.site.urls),
    
    # Root URL for public tenant
    path('', home, name='home'),
    
    # Authentication & User endpoints (διαθέσιμο και στο public tenant)
    path('api/users/', include('users.urls')),
    
    # Core endpoints (CSRF token) - διαθέσιμο στο public tenant
    path('api/', include('core.urls')),
]

# Include tenant URLs for tenant-specific endpoints
try:
    from tenant_urls import urlpatterns as tenant_urlpatterns
    urlpatterns += tenant_urlpatterns
except ImportError:
    pass

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
