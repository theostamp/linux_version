from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_model


class CustomTenantMiddleware(TenantMainMiddleware):
    """
    Custom tenant middleware that handles frontend proxy requests
    """
    
    def get_tenant(self, domain_model, hostname):
        """
        Override to handle frontend proxy requests
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
        
        # For localhost and other cases, use the default behavior (public tenant)
        return super().get_tenant(domain_model, hostname)
    
    def process_request(self, request):
        """
        Override to handle X-Forwarded-Host header
        """
        # Check for X-Forwarded-Host header first (for frontend container requests)
        forwarded_host = request.META.get('HTTP_X_FORWARDED_HOST')
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