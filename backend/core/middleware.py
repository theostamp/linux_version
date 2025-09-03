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
        # If the hostname is localhost or demo.localhost (from frontend proxy), use demo tenant
        if hostname in ['localhost', '127.0.0.1', 'demo.localhost']:
            try:
                tenant_model = get_tenant_model()
                demo_tenant = tenant_model.objects.get(schema_name='demo')
                return demo_tenant
            except tenant_model.DoesNotExist:
                # Fall back to public schema if demo tenant doesn't exist
                return super().get_tenant(domain_model, hostname)
        
        # For all other cases, use the default behavior
        return super().get_tenant(domain_model, hostname) 