from django.urls import path

from .views import get_csrf_token, api_root, community_messages
from .health_views import health_check, health_oauth, health_db, health_schema
from .debug_views import debug_media_info

urlpatterns = [
    path("", api_root, name="api_root"),
    path("csrf/", get_csrf_token, name="get_csrf_token"),
    path("community-messages/", community_messages, name="community_messages"),
    # Health check endpoints
    path("health/", health_check, name="health_check"),
    path("health/oauth/", health_oauth, name="health_oauth"),
    path("health/db/", health_db, name="health_db"),
    path("health/schema/", health_schema, name="health_schema"),
    # Debug endpoints
    path("debug/media-info/", debug_media_info, name="debug_media_info"),
]
