from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/assemblies/(?P<assembly_id>[^/]+)/$', consumers.AssemblyConsumer.as_asgi()),
]

