from django.contrib import admin
from django.urls import path, include   # ✅ ΕΔΩ η διόρθωση

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    # Admin panel
    path('admin/', admin.site.urls),

    # Authentication & User endpoints
    path('api/users/', include('users.urls')),

    # άλλα apps
    path('api/buildings/', include('buildings.urls')),
    path('api/tenants/', include('tenants.urls')),
    path('api/announcements/', include('announcements.urls')),
    path('api/user-requests/', include('user_requests.urls')),
    path('api/obligations/', include('obligations.urls')),
    path('api/votes/', include('votes.urls')),
    path('api/public-info/', include('public_info.urls')),

    # Core endpoints (π.χ. CSRF token)
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += staticfiles_urlpatterns()
