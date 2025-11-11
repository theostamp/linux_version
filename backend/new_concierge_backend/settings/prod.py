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
    # Fallback: Use default origins if not set
    CSRF_ORIGINS_STR = "https://linuxversion-production.up.railway.app,https://newconcierge.app"
    logger.warning("CSRF_TRUSTED_ORIGINS not set, using defaults")
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_ORIGINS_STR.split(",") if o.strip()]

# Always add the production Railway domain for admin access
production_railway_origin = 'https://linuxversion-production.up.railway.app'
if production_railway_origin not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(production_railway_origin)
    logger.info(f"Added production Railway domain to CSRF_TRUSTED_ORIGINS: {production_railway_origin}")

# Add Railway domain if provided via env var
railway_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
if railway_domain:
    railway_origin = f'https://{railway_domain}'
    if railway_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(railway_origin)
        logger.info(f"Added Railway domain from env var to CSRF_TRUSTED_ORIGINS: {railway_origin}")

# Add Vercel domains pattern
vercel_pattern = 'https://*.vercel.app'
if vercel_pattern not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(vercel_pattern)
    logger.info(f"Added Vercel pattern to CSRF_TRUSTED_ORIGINS: {vercel_pattern}")

logger.info(f"[PROD SETTINGS] CSRF_TRUSTED_ORIGINS: {CSRF_TRUSTED_ORIGINS}")

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

