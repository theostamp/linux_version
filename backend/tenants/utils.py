# backend/tenants/utils.py

import re
import socket
import logging
from typing import Optional, Dict, Tuple
from urllib.parse import urlparse
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_unique_schema_name(base_name: str, max_attempts: int = 9999) -> str:
    """
    Generate a unique schema name from a base name.
    
    Ensures RFC 1034/1035 compliance by using hyphens instead of underscores
    and keeping the name lowercase.
    
    Args:
        base_name: The base name to use for the schema
        max_attempts: Maximum number of attempts to find a unique name
        
    Returns:
        A unique schema name that is RFC compliant
    """
    from django_tenants.utils import get_tenant_model
    
    # Normalize the base name (lowercase, replace spaces/underscores with hyphens)
    base_name = base_name.lower().strip()
    base_name = re.sub(r'[^\w-]', '-', base_name)  # Replace non-word chars with hyphens
    base_name = re.sub(r'_+', '-', base_name)  # Replace underscores with hyphens
    base_name = re.sub(r'[-\s]+', '-', base_name)  # Replace multiple hyphens/spaces with single hyphen
    base_name = base_name.strip('-')  # Remove leading/trailing hyphens
    
    # Ensure it starts with a letter (RFC 1034/1035 requirement)
    if base_name and not base_name[0].isalpha():
        base_name = f"t-{base_name}"
    
    # Ensure minimum length
    if len(base_name) < 1:
        base_name = "tenant"
    
    # Ensure maximum length (PostgreSQL schema name limit is 63 characters)
    if len(base_name) > 63:
        base_name = base_name[:63]
        base_name = base_name.rstrip('-')
    
    tenant_model = get_tenant_model()
    
    # Try to find a unique name
    schema_name = base_name
    counter = 1
    
    while tenant_model.objects.filter(schema_name=schema_name).exists():
        if counter > max_attempts:
            raise ValueError(f"Could not generate unique schema name after {max_attempts} attempts")
        
        # Append a counter to make it unique
        suffix = f"-{counter}"
        available_length = 63 - len(suffix)
        
        if available_length < 1:
            raise ValueError("Base name is too long to append unique suffix")
        
        truncated_base = base_name[:available_length].rstrip('-')
        schema_name = f"{truncated_base}{suffix}"
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


def verify_subdomain_accessibility(
    subdomain: str,
    protocol: str = 'https',
    timeout: int = 10,
    verify_ssl: bool = True
) -> Dict[str, any]:
    """
    Verify if a subdomain is accessible (DNS + HTTP).
    
    This function checks:
    1. DNS resolution (if the subdomain resolves to an IP)
    2. HTTP accessibility (if the subdomain responds to HTTP requests)
    
    Args:
        subdomain: The subdomain to check (e.g., 'theo.newconcierge.app')
        protocol: The protocol to use ('http' or 'https')
        timeout: Timeout in seconds for requests
        verify_ssl: Whether to verify SSL certificates
        
    Returns:
        Dictionary with verification results:
        {
            'accessible': bool,
            'dns_resolved': bool,
            'http_accessible': bool,
            'status_code': int | None,
            'error': str | None,
            'url': str
        }
    """
    url = f"{protocol}://{subdomain}"
    result = {
        'accessible': False,
        'dns_resolved': False,
        'http_accessible': False,
        'status_code': None,
        'error': None,
        'url': url,
        'ip_address': None,
    }
    
    try:
        # Step 1: DNS Resolution Check
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or subdomain
            
            # Try to resolve DNS
            ip_address = socket.gethostbyname(hostname)
            result['dns_resolved'] = True
            result['ip_address'] = ip_address
            logger.debug(f"DNS resolution successful for {subdomain}: {ip_address}")
        except socket.gaierror as e:
            result['error'] = f"DNS resolution failed: {str(e)}"
            logger.warning(f"DNS resolution failed for {subdomain}: {e}")
            return result
        except Exception as e:
            result['error'] = f"DNS check error: {str(e)}"
            logger.error(f"DNS check error for {subdomain}: {e}")
            return result
        
        # Step 2: HTTP Accessibility Check
        try:
            response = requests.get(
                url,
                timeout=timeout,
                verify=verify_ssl,
                allow_redirects=True,
                headers={
                    'User-Agent': 'NewConcierge-TenantVerification/1.0'
                }
            )
            result['http_accessible'] = True
            result['status_code'] = response.status_code
            
            # Consider accessible if we get any HTTP response (even 404 is better than no response)
            if response.status_code < 500:  # 2xx, 3xx, 4xx are OK (means server responded)
                result['accessible'] = True
                logger.info(f"HTTP accessibility confirmed for {subdomain}: Status {response.status_code}")
            else:
                result['error'] = f"HTTP error status: {response.status_code}"
                logger.warning(f"HTTP error for {subdomain}: Status {response.status_code}")
        except requests.exceptions.SSLError as e:
            result['error'] = f"SSL error: {str(e)}"
            # If DNS resolved but SSL fails, subdomain might still be set up
            result['accessible'] = result['dns_resolved']
            logger.warning(f"SSL error for {subdomain}: {e} (but DNS resolved)")
        except requests.exceptions.ConnectionError as e:
            result['error'] = f"Connection error: {str(e)}"
            logger.warning(f"Connection error for {subdomain}: {e}")
        except requests.exceptions.Timeout:
            result['error'] = f"Request timeout after {timeout} seconds"
            logger.warning(f"Timeout for {subdomain}")
        except Exception as e:
            result['error'] = f"HTTP check error: {str(e)}"
            logger.error(f"HTTP check error for {subdomain}: {e}", exc_info=True)
        
    except Exception as e:
        result['error'] = f"Unexpected error: {str(e)}"
        logger.error(f"Unexpected error verifying {subdomain}: {e}", exc_info=True)
    
    return result


def get_production_subdomain(schema_name: str) -> str:
    """
    Get the production subdomain for a tenant schema.
    
    Args:
        schema_name: The tenant's schema name
        
    Returns:
        Full production subdomain (e.g., "theo.newconcierge.app")
    """
    import os
    
    # Get root domain from environment or settings
    root_domain = os.getenv('ROOT_DOMAIN', 'newconcierge.app')
    
    return f"{schema_name}.{root_domain}"


def check_subdomain_availability(
    subdomain: str,
    check_dns: bool = True,
    check_http: bool = True
) -> Tuple[bool, Optional[str]]:
    """
    Check if a subdomain is available (not already in use).
    
    Args:
        subdomain: The subdomain to check (e.g., 'theo.newconcierge.app')
        check_dns: Whether to check DNS resolution
        check_http: Whether to check HTTP accessibility
        
    Returns:
        Tuple of (is_available: bool, error_message: str | None)
    """
    from django_tenants.utils import get_tenant_domain_model
    
    DomainModel = get_tenant_domain_model()
    
    # Check if domain exists in database
    if DomainModel.objects.filter(domain=subdomain).exists():
        return False, f"Subdomain {subdomain} is already registered in the system"
    
    # Optionally check DNS/HTTP
    if check_dns or check_http:
        result = verify_subdomain_accessibility(
            subdomain,
            protocol='https',
            timeout=5,
            verify_ssl=True
        )
        
        if result['accessible']:
            return False, f"Subdomain {subdomain} is already accessible (may be configured elsewhere)"
        
        if result['dns_resolved'] and check_dns:
            return False, f"Subdomain {subdomain} DNS is resolved (may conflict with existing setup)"
    
    return True, None
