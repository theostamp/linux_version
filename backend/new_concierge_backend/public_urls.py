from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from django.http import HttpResponse


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
    
    # Root URL removed - now handled by Public App (Next.js)
    # path('', home, name='home'),
    
    # Authentication & User endpoints (διαθέσιμο και στο public tenant)
    path('api/users/', include('users.urls')),
    
    # Public buildings endpoint (διαθέσιμο στο public tenant)
    path('api/buildings/public/', include('buildings.public_urls')),
    
    # Core endpoints (CSRF token) - διαθέσιμο στο public tenant
    path('api/', include('core.urls')),
    
    # Billing endpoints (shared across all tenants)
    path('api/billing/', include('billing.urls')),
    
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