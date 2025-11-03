from django.conf import settings
from django.db import connection
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import (
    get_public_schema_name,
    get_tenant_model,
    get_tenant_domain_model,
)
import logging

logger = logging.getLogger(__name__)

try:
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework_simplejwt.exceptions import InvalidToken
except ImportError:  # pragma: no cover - DRF/JWT not installed in minimal environments
    JWTAuthentication = None
    InvalidToken = Exception


class CustomTenantMiddleware(TenantMainMiddleware):
    """
    Custom tenant middleware that handles frontend proxy requests.

    This middleware:
    1. Bypasses Django's strict hostname validation to allow RFC-compliant domains
    2. Handles X-Forwarded-Host header for proxied requests
    3. Provides custom tenant resolution logic
    """

    @staticmethod
    def hostname_from_request(request):
        """
        Extract hostname from request, bypassing Django's strict validation.

        Django's request.get_host() validates hostnames against RFC 1034/1035.
        We bypass this by reading HTTP_HOST directly and stripping the port.

        Returns:
            str: The hostname without port number
        """
        from django_tenants.utils import remove_www
        # Get the raw HTTP_HOST header instead of using request.get_host()
        # to bypass Django's strict hostname validation
        host = request.META.get('HTTP_HOST', '')
        hostname = host.split(':')[0]  # Strip port
        return remove_www(hostname)

    def get_tenant(self, domain_model, hostname):
        """
        Custom tenant resolution logic.

        Args:
            domain_model: The Domain model class
            hostname: The hostname to look up

        Returns:
            Client: The tenant object
        """
        # If the hostname is demo.localhost, use demo tenant
        if hostname in ['demo.localhost']:
            try:
                tenant_model = get_tenant_model()
                demo_tenant = tenant_model.objects.get(schema_name='demo')
                return demo_tenant
            except tenant_model.DoesNotExist:
                # Fall back to public schema if demo tenant doesn't exist
                return super().get_tenant(domain_model, hostname)

        # For all other cases, use the default behavior
        return super().get_tenant(domain_model, hostname)

    def process_request(self, request):
        """
        Process incoming request and set up tenant context.

        Handles:
        - X-Forwarded-Host header for proxied requests
        - Port stripping (already handled by hostname_from_request)
        
        NOTE: X-Tenant-Schema header is handled by SessionTenantMiddleware,
        but CustomTenantMiddleware must still set up the tenant from hostname
        so that the correct URLconf (tenant_urls.py) is used.
        """
        # Check for X-Forwarded-Host header (for frontend container requests)
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST')
        original_host = None

        if forwarded_host:
            # Temporarily modify the request's META to use the forwarded host
            original_host = request.META.get('HTTP_HOST')
            request.META['HTTP_HOST'] = forwarded_host

        # Call the parent process_request to set up tenant from hostname
        # This is necessary even with X-Tenant-Schema header because we need
        # the URLconf to be set to tenant_urls.py
        response = super().process_request(request)

        # Restore original host if it was modified
        if forwarded_host and original_host:
            request.META['HTTP_HOST'] = original_host

        return response 


class SessionTenantMiddleware:
    """Switch database schema based on the authenticated user's tenant.

    When we serve all tenants from a shared production domain (Railway), the
    default django-tenants routing cannot rely on the hostname. This middleware
    inspects the authenticated user (session or JWT) and temporarily switches
    the active connection to the user's tenant schema so that standard DRF
    viewsets (e.g. announcements, votes, user requests) operate on the correct
    database.

    The middleware falls back to the public schema for unauthenticated requests
    or when the tenant cannot be resolved.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # By default keep whatever schema the tenant middleware selected
        tenant = self._resolve_tenant_from_request(request)
        
        # Debug logging for tenant-specific endpoints
        if request.path.startswith('/api/announcements') or \
           request.path.startswith('/api/votes') or \
           request.path.startswith('/api/user-requests') or \
           request.path.startswith('/api/obligations'):
            logger.info(f"[SessionTenantMiddleware] Processing {request.path}")
            logger.info(f"[SessionTenantMiddleware] X-Tenant-Schema header: {request.META.get('HTTP_X_TENANT_SCHEMA')}")
            logger.info(f"[SessionTenantMiddleware] Resolved tenant: {getattr(tenant, 'schema_name', None) if tenant else 'None'}")
            logger.info(f"[SessionTenantMiddleware] Current connection schema: {connection.schema_name}")
            logger.info(f"[SessionTenantMiddleware] Current connection tenant: {getattr(connection, 'tenant', None)}")
            current_urlconf_before = getattr(request, "urlconf", None)
            logger.info(f"[SessionTenantMiddleware] Current URLconf: {current_urlconf_before} (type: {type(current_urlconf_before)})")
            logger.info(f"[SessionTenantMiddleware] Expected TENANT_URLCONF: {getattr(settings, 'TENANT_URLCONF', None)}")

        if not tenant:
            # No tenant override needed, keep whatever CustomTenantMiddleware set
            return self.get_response(request)

        # Check if CustomTenantMiddleware already set the correct tenant
        current_tenant = getattr(connection, "tenant", None)
        current_schema = getattr(current_tenant, "schema_name", None) if current_tenant else None
        target_schema = getattr(tenant, "schema_name", None)
        
        # Check if urlconf is already set correctly
        # urlconf can be a string ('tenant_urls') or the actual module
        current_urlconf = getattr(request, "urlconf", None)
        tenant_urlconf_name = getattr(settings, "TENANT_URLCONF", None)
        
        # urlconf is correct if it's set to TENANT_URLCONF or contains tenant_urls
        urlconf_is_correct = False
        if current_urlconf and tenant_urlconf_name:
            if current_urlconf == tenant_urlconf_name:
                urlconf_is_correct = True
            elif hasattr(current_urlconf, '__name__') and tenant_urlconf_name in current_urlconf.__name__:
                urlconf_is_correct = True
            elif isinstance(current_urlconf, str) and tenant_urlconf_name in current_urlconf:
                urlconf_is_correct = True
        
        if current_schema == target_schema and urlconf_is_correct:
            # Tenant is already correct AND urlconf is set, just store it on request and continue
            logger.debug(f"[SessionTenantMiddleware] Tenant {target_schema} and URLconf already set correctly, no override needed")
            request.tenant = tenant
            return self.get_response(request)
        
        # Tenant might be correct but urlconf is missing, or tenant needs override
        if current_schema == target_schema:
            logger.debug(f"[SessionTenantMiddleware] Tenant {target_schema} already set but URLconf is missing/incorrect, setting URLconf")
        else:
            logger.debug(f"[SessionTenantMiddleware] Overriding tenant from {current_schema} to {target_schema}")
        
        previous_tenant = current_tenant
        previous_schema = connection.schema_name
        previous_urlconf = getattr(request, "urlconf", None)

        try:
            # Switch to tenant schema for data access
            # NOTE: JWT authentication will happen in public schema via PublicSchemaJWTAuthentication
            # which temporarily switches back to public schema for user lookup
            connection.set_tenant(tenant)
            request.tenant = tenant
            
            # Set tenant urlconf (might already be set by CustomTenantMiddleware)
            tenant_urlconf = getattr(tenant, "get_urlconf", None)
            fallback_urlconf = getattr(settings, "TENANT_URLCONF", None)

            if callable(tenant_urlconf):
                request.urlconf = tenant_urlconf()
            elif fallback_urlconf:
                request.urlconf = fallback_urlconf
            else:
                request.urlconf = None
            
            # Debug logging for tenant-specific endpoints
            if request.path.startswith('/api/announcements') or \
               request.path.startswith('/api/votes') or \
               request.path.startswith('/api/user-requests') or \
               request.path.startswith('/api/obligations'):
                logger.info(f"[SessionTenantMiddleware] Set URLconf to: {request.urlconf} (type: {type(request.urlconf)})")
                
            return self.get_response(request)
        finally:
            # Restore original tenant state to avoid leaking schema between requests
            if previous_tenant is not None:
                connection.set_tenant(previous_tenant)
            else:
                connection.set_schema_to_public()

            if previous_urlconf is not None:
                request.urlconf = previous_urlconf
            elif hasattr(request, "urlconf"):
                delattr(request, "urlconf")

            # Also restore request.tenant if we set it
            if previous_tenant is not None:
                request.tenant = previous_tenant
            elif hasattr(request, "tenant"):
                delattr(request, "tenant")

    def _resolve_tenant_from_request(self, request):
        """Return the tenant associated with the current request, if any."""

        # Allow specific auth endpoints (like /api/users/login/) to honour an explicit
        # X-Tenant-Schema header even though they are normally treated as public.
        # This fixes tenant logins on custom subdomains where the request is routed
        # through the public domain and would otherwise resolve to the public schema.
        header_tenant = self._tenant_from_header(request)

        if self._should_skip_path(request.path):
            if header_tenant and self._header_override_allowed(request.path):
                logger.debug(
                    "[SessionTenantMiddleware] Overriding skip list for %s using header schema %s",
                    request.path,
                    getattr(header_tenant, "schema_name", None),
                )
                return header_tenant
            return None

        tenant = None

        # 1) X-Tenant-Schema header (from subdomain-based routing)
        if header_tenant:
            # IMPORTANT: For JWT-authenticated requests, we need to authenticate the user
            # in the PUBLIC schema first (where users are stored), then switch to tenant schema
            # So we return the tenant but JWT authentication will happen in public schema
            return header_tenant

        # 2) Session-based authentication (request.user populated by Django auth)
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            tenant = getattr(user, "tenant", None)

        # 3) JWT-based authentication (API requests from the frontend)
        # This won't work here because we haven't authenticated yet
        # JWT authentication happens AFTER this middleware, but BEFORE we switch schemas
        # So we rely on X-Tenant-Schema header for tenant-specific requests

        if not tenant:
            return None

        schema_name = getattr(tenant, "schema_name", None)
        if not schema_name or schema_name == get_public_schema_name():
            return None

        return tenant

    def _tenant_from_header(self, request):
        """Resolve tenant via X-Tenant-Schema header (from subdomain routing).
        
        The header value can be either:
        1. A schema_name (direct lookup)
        2. A subdomain (e.g., 'demo' from 'demo.newconcierge.app')
        
        We first try to find by schema_name, then by domain/subdomain.
        """
        tenant_schema = request.META.get('HTTP_X_TENANT_SCHEMA')
        if not tenant_schema:
            return None

        try:
            tenant_model = get_tenant_model()
            domain_model = get_tenant_domain_model()
            
            # First, try to find tenant by schema_name (backward compatibility)
            try:
                tenant = tenant_model.objects.get(schema_name=tenant_schema)
                logger.debug(f"[SessionTenantMiddleware] Resolved tenant from X-Tenant-Schema header (by schema_name): {tenant_schema}")
                return tenant
            except tenant_model.DoesNotExist:
                # If not found by schema_name, try to find by domain/subdomain
                # The header value might be a subdomain (e.g., 'demo' from 'demo.newconcierge.app')
                # Try to match it against domain names
                pass
            
            # Try to find tenant by domain matching
            # Check if tenant_schema matches a domain (exact match or subdomain)
            domain = domain_model.objects.filter(
                domain__iexact=tenant_schema
            ).first()
            
            if not domain:
                # Try matching as subdomain (e.g., 'demo' matches 'demo.localhost' or 'demo.newconcierge.app')
                # Extract subdomain from domain if it contains dots
                domain = domain_model.objects.filter(
                    domain__icontains=f".{tenant_schema}."
                ).first() or domain_model.objects.filter(
                    domain__istartswith=f"{tenant_schema}."
                ).first()
            
            if domain:
                tenant = domain.tenant
                logger.debug(f"[SessionTenantMiddleware] Resolved tenant from X-Tenant-Schema header (by domain): {tenant_schema} → {domain.domain} → {tenant.schema_name}")
                return tenant
            
            logger.warning(f"[SessionTenantMiddleware] Tenant not found for X-Tenant-Schema header value: {tenant_schema} (tried schema_name and domain matching)")
            return None
            
        except Exception as e:
            logger.error(f"[SessionTenantMiddleware] Error resolving tenant from header: {e}", exc_info=True)
            return None

    def _tenant_from_jwt(self, request):
        """Resolve tenant via JWT Authorization header."""

        try:
            jwt_auth = JWTAuthentication()
            header = jwt_auth.get_header(request)
            if header is None:
                return None

            raw_token = jwt_auth.get_raw_token(header)
            if raw_token is None:
                return None

            validated_token = jwt_auth.get_validated_token(raw_token)
            user = jwt_auth.get_user(validated_token)
            if not user:
                return None

            return getattr(user, "tenant", None)
        except InvalidToken:
            return None
        except Exception:
            return None

    def _should_skip_path(self, path: str) -> bool:
        """Determine if the current path should remain in the public schema."""

        public_prefixes = (
            "/admin",
            "/api/users/register",
            "/api/users/login",
            "/api/users/verify-email",
            "/api/users/token",
            "/api/users/password",
            "/api/billing/webhook",
            "/api/buildings/public/",
            "/api/internal/",
        )

        return any(path.startswith(prefix) for prefix in public_prefixes)

    def _header_override_allowed(self, path: str) -> bool:
        """Allow X-Tenant-Schema override on specific auth endpoints."""

        override_paths = (
            "/api/users/login",
            "/api/users/token",
            "/api/users/token/",
            "/api/users/me",  # Add /api/users/me for tenant user verification
        )

        return any(path.startswith(prefix) for prefix in override_paths)