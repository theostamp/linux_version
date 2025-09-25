from django.urls import path 
   
from .views import get_csrf_token, api_root, community_messages

urlpatterns = [
    path("", api_root, name="api_root"),
    path("csrf/", get_csrf_token, name="get_csrf_token"),
    path("community-messages/", community_messages, name="community_messages"),
]
