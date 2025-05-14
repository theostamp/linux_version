# backend/new_concierge_backend/urls.py

from django.contrib import admin
from django.urls import path, include

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


    # Core endpoints (π.χ. CSRF token)
    path('api/', include('core.urls')),
]
