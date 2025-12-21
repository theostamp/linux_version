import logging
import os
from typing import Optional
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django_tenants.utils import remove_www, schema_context, get_tenant_model


logger = logging.getLogger(__name__)


def _get_header(scope, name: str) -> Optional[str]:
    """
    Διαβάζει header από ASGI scope (headers είναι list[tuple[bytes, bytes]]).
    """
    name_b = name.lower().encode("ascii")
    for k, v in scope.get("headers", []):
        if k.lower() == name_b:
            try:
                return v.decode("utf-8")
            except Exception:
                return v.decode("latin-1", errors="ignore")
    return None


def _hostname_from_scope(scope) -> str:
    """
    Αντίστοιχο του CustomTenantMiddleware.hostname_from_request, αλλά για ASGI scope.
    Priority:
    - X-Tenant-Host (όταν υπάρχει proxy που μπορεί να προσθέσει header)
    - X-Forwarded-Host
    - Host
    """
    tenant_host = _get_header(scope, "x-tenant-host") or ""
    forwarded_host = _get_header(scope, "x-forwarded-host") or ""
    host = _get_header(scope, "host") or ""

    raw = tenant_host or forwarded_host or host
    hostname = raw.split(",")[0].strip().split(":")[0].strip()  # handle possible multi-host headers + port
    return remove_www(hostname)


class TenantSchemaMiddleware(BaseMiddleware):
    """
    Middleware για Channels/WebSockets που λύνει tenant schema και το βάζει στο scope ως:
    - scope['tenant_schema']

    Σημείωση: σε browsers δεν μπορούμε να βασιστούμε πάντα στο X-Tenant-Host, άρα το Host πρέπει
    να είναι το πραγματικό tenant domain όταν η σύνδεση γίνεται απευθείας.
    """

    BASE_DOMAIN_TENANT_MAP = {
        "newconcierge.app": "public",
    }

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        hostname = _hostname_from_scope(scope)

        # Fallback: αν είμαστε σε shared/internal host και το client περνά schema/tenant_host στο query string
        # (χρήσιμο όταν η υποδομή δεν κρατά το αρχικό Host header για websockets)
        try:
            qs = parse_qs((scope.get("query_string") or b"").decode("utf-8"))
        except Exception:
            qs = {}
        schema_hint = (qs.get("schema") or [None])[0]
        tenant_host_hint = (qs.get("tenant_host") or [None])[0]
        if hostname in {"localhost", "127.0.0.1", "backend"}:
            if tenant_host_hint:
                hostname = remove_www(str(tenant_host_hint).split(",")[0].split(":")[0].strip())
            elif schema_hint:
                hostname = remove_www(f"{schema_hint}.newconcierge.app")

        scope["tenant_hostname"] = hostname
        scope["tenant_schema"] = await self._resolve_schema_name(hostname)

        if not scope["tenant_schema"]:
            logger.warning("❌ [ASGI TENANT] Could not resolve tenant for hostname '%s'", hostname)
            # αφήνουμε να προχωρήσει - ο consumer συνήθως θα κλείσει αν δεν έχει schema
        else:
            logger.debug("✅ [ASGI TENANT] Resolved hostname '%s' -> schema '%s'", hostname, scope["tenant_schema"])

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _resolve_schema_name(self, hostname: str) -> Optional[str]:
        if not hostname:
            return None

        canonical = hostname.lower()

        # dev shortcut
        if canonical in {"demo.localhost"}:
            return "demo"

        # local/dev fallbacks (localhost, docker hostnames)
        if canonical in {"localhost", "127.0.0.1", "backend"}:
            return os.getenv("TENANT_SCHEMA_NAME", "demo")

        # static mapping
        if canonical in self.BASE_DOMAIN_TENANT_MAP:
            return self.BASE_DOMAIN_TENANT_MAP[canonical]

        # Domain lookup (public schema)
        try:
            with schema_context("public"):
                from tenants.models import Domain  # imported here to ensure public schema context
                domain = Domain.objects.select_related("tenant").get(domain=canonical)
                return domain.tenant.schema_name
        except Exception:
            # fallback: schema by subdomain (like CustomTenantMiddleware)
            parts = canonical.split(".")
            if len(parts) > 1:
                subdomain = parts[0]
                if subdomain not in ("www", ""):
                    try:
                        with schema_context("public"):
                            tenant_model = get_tenant_model()
                            tenant = tenant_model.objects.get(schema_name=subdomain)
                            return tenant.schema_name
                    except Exception:
                        return None
            return None


def TenantSchemaMiddlewareStack(inner):
    """
    Helper factory για να κρατήσουμε καθαρό το asgi.py.
    """
    return TenantSchemaMiddleware(inner)


