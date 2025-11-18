import logging

from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_model


logger = logging.getLogger(__name__)


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
        
        Priority:
        1. X-Forwarded-Host header (for proxied requests from Next.js)
        2. HTTP_HOST header (direct requests)

        Returns:
            str: The hostname without port number
        """
        from django_tenants.utils import remove_www
        # Check X-Tenant-Host first (custom header that Railway won't overwrite)
        # Railway Edge proxy overwrites X-Forwarded-Host, so we use X-Tenant-Host
        tenant_host = request.META.get('HTTP_X_TENANT_HOST', '')
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST', '')
        internal_host = request.META.get('HTTP_HOST', '')
        
        # Priority: X-Tenant-Host > X-Forwarded-Host > HTTP_HOST
        if tenant_host:
            hostname = tenant_host.split(':')[0]  # Strip port
            final_hostname = remove_www(hostname)
            logger.debug(
                "🔍 [TENANT MIDDLEWARE] hostname_from_request: Using X-Tenant-Host '%s' -> '%s' (internal: '%s')",
                tenant_host,
                final_hostname,
                internal_host,
            )
            return final_hostname
        
        if forwarded_host:
            hostname = forwarded_host.split(':')[0]  # Strip port
            final_hostname = remove_www(hostname)
            logger.debug(
                "🔍 [TENANT MIDDLEWARE] hostname_from_request: Using X-Forwarded-Host '%s' -> '%s' (internal: '%s')",
                forwarded_host,
                final_hostname,
                internal_host,
            )
            return final_hostname
        
        # Fall back to HTTP_HOST for direct requests
        host = internal_host
        hostname = host.split(':')[0]  # Strip port
        final_hostname = remove_www(hostname)
        logger.debug(
            "🔍 [TENANT MIDDLEWARE] hostname_from_request: Using HTTP_HOST '%s' -> '%s'",
            host,
            final_hostname,
        )
        return final_hostname

    def get_tenant(self, domain_model, hostname):
        """
        Custom tenant resolution logic.

        Args:
            domain_model: The Domain model class
            hostname: The hostname to look up

        Returns:
            Client: The tenant object
        """
        logger.debug("🔍 [TENANT MIDDLEWARE] get_tenant called with hostname: '%s'", hostname)
        
        # If the hostname is demo.localhost, use demo tenant
        if hostname in ['demo.localhost']:
            try:
                tenant_model = get_tenant_model()
                demo_tenant = tenant_model.objects.get(schema_name='demo')
                logger.info("🔍 [TENANT MIDDLEWARE] Resolved demo.localhost -> demo tenant")
                return demo_tenant
            except tenant_model.DoesNotExist:
                # Fall back to public schema if demo tenant doesn't exist
                logger.warning("⚠️ [TENANT MIDDLEWARE] Demo tenant not found, falling back to default")
                return super().get_tenant(domain_model, hostname)

        # For all other cases, use the default behavior first
        try:
            tenant = super().get_tenant(domain_model, hostname)
            logger.info(
                "🔍 [TENANT MIDDLEWARE] Resolved '%s' -> tenant '%s' via domain lookup",
                hostname,
                tenant.schema_name,
            )
            return tenant
        except domain_model.DoesNotExist:
            logger.warning(
                "⚠️ [TENANT MIDDLEWARE] Domain '%s' not found, trying subdomain fallback",
                hostname,
            )
            # Fallback: attempt to resolve tenant by subdomain if domain entry is missing
            parts = hostname.split(".")
            if len(parts) > 1:
                subdomain = parts[0]
                # Ignore common prefixes that shouldn't map to tenants
                if subdomain not in ("www", ""):
                    tenant_model = get_tenant_model()
                    try:
                        tenant = tenant_model.objects.get(schema_name=subdomain)
                        logger.info(
                            "🔍 [TENANT MIDDLEWARE] Resolved '%s' -> tenant '%s' via subdomain '%s'",
                            hostname,
                            tenant.schema_name,
                            subdomain,
                        )
                        # Ensure domain record exists for future requests
                        domain_model.objects.get_or_create(
                            domain=hostname,
                            defaults={
                                "tenant": tenant,
                                "is_primary": False,
                            },
                        )
                        return tenant
                    except tenant_model.DoesNotExist:
                        logger.warning(
                            "❌ [TENANT MIDDLEWARE] Tenant with schema_name '%s' not found",
                            subdomain,
                        )
                        pass

            # If fallback also fails, re-raise the original exception
            logger.error("❌ [TENANT MIDDLEWARE] Failed to resolve tenant for hostname '%s'", hostname)
            raise

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