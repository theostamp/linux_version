from django.conf import settings
from django.db import connection
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import (
    get_public_schema_name,
    get_tenant_model,
)

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
        """
        # Check for X-Forwarded-Host header first (for frontend container requests)
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST')
        original_host = None

        if forwarded_host:
            # Temporarily modify the request's META to use the forwarded host
            original_host = request.META.get('HTTP_HOST')
            request.META['HTTP_HOST'] = forwarded_host

        # Call the parent process_request
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

        if not tenant:
            return self.get_response(request)

        previous_tenant = getattr(connection, "tenant", None)
        previous_schema = connection.schema_name
        previous_urlconf = getattr(request, "urlconf", None)

        try:
            connection.set_tenant(tenant)
            request.tenant = tenant
            tenant_urlconf = getattr(tenant, "get_urlconf", None)
            fallback_urlconf = getattr(settings, "TENANT_URLCONF", None)

            if callable(tenant_urlconf):
                request.urlconf = tenant_urlconf()
            elif fallback_urlconf:
                request.urlconf = fallback_urlconf
            else:
                request.urlconf = None
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

        # Skip tenant switching for explicitly public endpoints (auth, billing webhooks, etc.)
        if self._should_skip_path(request.path):
            return None

        tenant = None

        # 1) Session-based authentication (request.user populated by Django auth)
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            tenant = getattr(user, "tenant", None)

        # 2) JWT-based authentication (API requests from the frontend)
        if not tenant and JWTAuthentication is not None:
            tenant = self._tenant_from_jwt(request)

        if not tenant:
            return None

        schema_name = getattr(tenant, "schema_name", None)
        if not schema_name or schema_name == get_public_schema_name():
            return None

        return tenant

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