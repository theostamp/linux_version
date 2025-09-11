from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Το URL που θα χρησιμοποιεί το frontend για να συνδεθεί
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]