import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django_tenants.utils import schema_context
from rest_framework_simplejwt.authentication import JWTAuthentication


logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """
    Channels middleware που κάνει authentication μέσω SimpleJWT token σε query string:
      ws://.../ws/.../?token=<access_token>

    Χρήσιμο γιατί ο browser WebSocket client δεν επιτρέπει custom headers (Authorization).
    """

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = await self._get_user(scope)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, scope):
        try:
            raw_qs = scope.get("query_string", b"")
            qs = parse_qs(raw_qs.decode("utf-8"))
        except Exception:
            qs = {}

        token = (qs.get("token") or [None])[0]
        if not token:
            return AnonymousUser()

        auth = JWTAuthentication()
        try:
            validated = auth.get_validated_token(token)
            # Users ζουν στο public schema
            with schema_context("public"):
                return auth.get_user(validated)
        except Exception as exc:
            logger.warning("Invalid JWT token on websocket: %s", exc)
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)


