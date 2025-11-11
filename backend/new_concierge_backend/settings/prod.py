"""
Production settings - extends base.py
Explicit environment variables required - no hardcoded domains or wildcards
"""
from .base import *
import logging

logger = logging.getLogger('django')

# Production settings
DEBUG = False

# Explicit ALLOWED_HOSTS from environment - NO WILDCARDS
ALLOWED_HOSTS_STR = os.getenv("DJANGO_ALLOWED_HOSTS", "")
if not ALLOWED_HOSTS_STR:
    raise ValueError(
        "DJANGO_ALLOWED_HOSTS must be set in production environment. "
        "Example: 'yourdomain.com,api.yourdomain.com,*.railway.app'"
    )
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_STR.split(",") if h.strip()]

# Railway proxy settings
if os.getenv('RAILWAY_PUBLIC_DOMAIN'):
    USE_X_FORWARDED_HOST = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Session and Cookie settings for Railway HTTPS
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = 'Lax'

# Explicit CSRF_TRUSTED_ORIGINS from environment
CSRF_ORIGINS_STR = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if not CSRF_ORIGINS_STR:
    raise ValueError(
        "CSRF_TRUSTED_ORIGINS must be set in production environment. "
        "Example: 'https://yourdomain.com,https://*.vercel.app'"
    )
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_ORIGINS_STR.split(",") if o.strip()]

# Add Railway domain if provided
railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if railway_domain:
    railway_origin = f'https://{railway_domain}'
    if railway_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(railway_origin)
    logger.info(f"Added Railway domain to CSRF_TRUSTED_ORIGINS: {railway_origin}")

# CORS origins from environment
CORS_ORIGINS_STR = os.getenv("CORS_ALLOWED_ORIGINS", "")
if not CORS_ORIGINS_STR:
    raise ValueError(
        "CORS_ALLOWED_ORIGINS must be set in production environment. "
        "Example: 'https://yourdomain.com,https://*.vercel.app'"
    )
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ORIGINS_STR.split(",") if o.strip()]

# Vercel preview deployments support
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[\w\.-]+\.vercel\.app$",  # Vercel preview deployments
]

logger.info(f"[PROD SETTINGS] ALLOWED_HOSTS: {ALLOWED_HOSTS}")
logger.info(f"[PROD SETTINGS] CSRF_TRUSTED_ORIGINS count: {len(CSRF_TRUSTED_ORIGINS)}")
logger.info(f"[PROD SETTINGS] CORS_ALLOWED_ORIGINS count: {len(CORS_ALLOWED_ORIGINS)}")

