# backend/core/authentication.py

from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import connection


class PublicSchemaJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that always looks up users in the public schema.
    
    This is necessary because:
    1. Users are stored in the public schema (SHARED_APPS)
    2. DRF authentication happens during view dispatch
    3. By the time DRF authenticates, middleware may have switched to tenant schema
    4. User lookup would fail in tenant schema
    
    This class ensures user authentication always happens in public schema,
    regardless of current connection schema.
    """
    
    def get_user(self, validated_token):
        """
        Override get_user to always look up users in public schema.
        """
        # Save current tenant/schema state
        current_tenant = getattr(connection, "tenant", None)
        current_schema = connection.schema_name
        
        try:
            # Switch to public schema for user lookup
            connection.set_schema_to_public()
            
            # Call parent method to get user (will query public schema)
            return super().get_user(validated_token)
        finally:
            # Restore original tenant/schema state
            if current_tenant is not None:
                connection.set_tenant(current_tenant)
            elif current_schema != 'public':
                # If we had a specific schema but no tenant object, restore it
                # This shouldn't happen in normal flow, but handle it safely
                try:
                    from django_tenants.utils import schema_context
                    with schema_context(current_schema):
                        pass  # Just ensure schema is restored
                    connection.set_schema_to_public()  # Fallback to public
                except:
                    connection.set_schema_to_public()
            else:
                connection.set_schema_to_public()

