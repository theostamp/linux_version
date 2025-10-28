# backend/tenants/utils.py
"""
Utilities for tenant management
"""
import re
from django.utils.text import slugify


def generate_schema_name_from_email(email: str) -> str:
    """
    Generate a clean, database-safe schema name from an email address.
    
    Uses only the part before @ (email prefix).
    
    Examples:
        etherm2021@gmail.com    → etherm2021
        john.doe@company.com    → john-doe
        test_user@test.com      → test-user
        special!char@test.com   → specialchar
    
    Args:
        email: User's email address
        
    Returns:
        Clean schema name (lowercase, alphanumeric with hyphens)
    """
    # Extract email prefix (before @)
    email_prefix = email.split('@')[0]
    
    # Use Django's slugify to create a clean, URL-safe string
    # This converts to lowercase, replaces special chars with hyphens
    schema_name = slugify(email_prefix)
    
    # Ensure it's not empty
    if not schema_name or len(schema_name) < 1:
        # Fallback: use a generic name with timestamp
        import time
        schema_name = f"tenant-{int(time.time())}"
    
    # Limit length to 63 characters (PostgreSQL identifier limit)
    schema_name = schema_name[:63]
    
    return schema_name


def generate_unique_schema_name(base_name: str) -> str:
    """
    Generate a unique schema name by appending a counter if needed.
    
    Args:
        base_name: Base schema name (e.g., from email prefix)
        
    Returns:
        Unique schema name
    """
    from tenants.models import Client
    
    schema_name = base_name
    counter = 1
    
    # Keep incrementing until we find a unique name
    while Client.objects.filter(schema_name=schema_name).exists():
        schema_name = f"{base_name}-{counter}"
        counter += 1
    
    return schema_name


def get_tenant_subdomain(schema_name: str, is_production: bool = False) -> str:
    """
    Get the subdomain for a tenant based on environment.
    
    Args:
        schema_name: The tenant's schema name
        is_production: Whether running in production
        
    Returns:
        Full subdomain string (e.g., "etherm2021.localhost" or shared domain)
    """
    import os
    from django.conf import settings
    
    if is_production or os.getenv('RAILWAY_PUBLIC_DOMAIN'):
        # Production: all tenants share the main domain
        return os.getenv('RAILWAY_PUBLIC_DOMAIN', 'linuxversion-production.up.railway.app')
    else:
        # Development: each tenant gets a subdomain
        return f"{schema_name}.localhost"

