"""
ASGI config for new_concierge_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.routing import websocket_urlpatterns as chat_urlpatterns
from assemblies.routing import websocket_urlpatterns as assembly_urlpatterns
from core.channels_tenant_middleware import TenantSchemaMiddlewareStack
from core.channels_jwt_auth_middleware import JWTAuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TenantSchemaMiddlewareStack(
        JWTAuthMiddlewareStack(
            URLRouter(
                chat_urlpatterns + assembly_urlpatterns
            )
        )
    ),
})
