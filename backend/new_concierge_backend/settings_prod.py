# backend/new_concierge_backend/settings_prod.py
"""
Production Settings for Financial Management System
Optimized for security, performance, and monitoring
"""

import os
from .settings import *  # Import base settings
from datetime import timedelta

# ----------------------------------------
# 🔐 Production Security
# ----------------------------------------
DEBUG = False
IS_PRODUCTION = True

# Strict security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 3600  # 1 hour

# CSRF security
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')

# ----------------------------------------
# 🗄️ Database Optimization
# ----------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.getenv('DB_NAME', 'postgres'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'db'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': 600,  # 10 minutes connection pooling
        'CONN_HEALTH_CHECKS': True,
    }
}

# Database optimization
DATABASE_OPTIONS = {
    'ATOMIC_REQUESTS': True,
    'AUTOCOMMIT': False,
}

# ----------------------------------------
# 🚀 Performance Optimization
# ----------------------------------------

# Caching configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'financial_prod',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'session': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'session_prod',
    },
    'financial': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/3'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'financial_data',
        'TIMEOUT': 1800,  # 30 minutes for financial data
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'session'

# Cache middleware
MIDDLEWARE = [
    'django.middleware.cache.UpdateCacheMiddleware',  # Must be first
] + MIDDLEWARE + [
    'django.middleware.cache.FetchFromCacheMiddleware',  # Must be last
]

# Cache settings
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'financial_prod'
CACHE_MIDDLEWARE_ALIAS = 'default'

# ----------------------------------------
# 📊 Monitoring & Logging
# ----------------------------------------

# Simplified logging configuration - console only for Railway deployment
# This avoids file system issues in containerized environments
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(module)s"}',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'financial': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'audit': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# ----------------------------------------
# 🔒 Security Headers
# ----------------------------------------
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://m.stripe.network")
CSP_SCRIPT_SRC = ("'self'", "https://m.stripe.network")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'", "https://m.stripe.network")

# ----------------------------------------
# 📧 Email Configuration
# ----------------------------------------
EMAIL_BACKEND = 'users.email_backends.ResendEmailBackend'
DEFAULT_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', 'noreply@newconcierge.gr')

# Resend API Configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', 'noreply@newconcierge.gr')

# Email logging
ADMINS = [
    ('Admin', os.getenv('ADMIN_EMAIL', 'admin@example.com')),
]

# ----------------------------------------
# 🚀 REST Framework Production Settings
# ----------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FileUploadParser',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # Increased for production
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'NON_FIELD_ERRORS_KEY': 'error',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Reduced for security
        'user': '5000/hour',  # Increased for better user experience
    },
}

# JWT Production Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Reduced for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,  # Enable token rotation
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=15),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# ----------------------------------------
# 📁 Static & Media Files
# ----------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = '/vol/static'
MEDIA_ROOT = '/vol/media'
MEDIA_URL = '/media/'

# Static files optimization
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# ----------------------------------------
# 🔌 Channels & WebSocket Production
# ----------------------------------------
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://redis:6379/0')],
            "capacity": 1500,  # Maximum number of messages in a channel layer
            "expiry": 10,  # Message expiry in seconds
        },
    },
}

# ----------------------------------------
# 🎯 Application Specific Settings
# ----------------------------------------

# Financial system production settings
FINANCIAL_SETTINGS = {
    'AUDIT_LOG_ENABLED': True,
    'AUDIT_LOG_RETENTION_DAYS': 365,
    'MAX_FILE_SIZE': 10 * 1024 * 1024,  # 10MB
    'ALLOWED_FILE_TYPES': ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls'],
    'BACKUP_ENABLED': True,
    'BACKUP_RETENTION_DAYS': 30,
    'REPORT_CACHE_TIMEOUT': 1800,  # 30 minutes
    'METER_READING_VALIDATION': True,
    'AUTO_CALCULATION_ENABLED': True,
}

# Performance monitoring
PERFORMANCE_MONITORING = {
    'ENABLED': True,
    'SLOW_QUERY_THRESHOLD': 1.0,  # seconds
    'MEMORY_USAGE_MONITORING': True,
    'API_RESPONSE_TIME_MONITORING': True,
}

# ----------------------------------------
# 🚨 Error Reporting
# ----------------------------------------
# Sentry configuration (if using Sentry)
SENTRY_DSN = os.getenv('SENTRY_DSN', '')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=True,
    )

# ----------------------------------------
# 🔧 Maintenance Mode
# ----------------------------------------
MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'False') == 'True'
MAINTENANCE_MODE_IGNORE_IP_ADDRESSES = os.getenv('MAINTENANCE_MODE_IGNORE_IPS', '').split(',')

# ----------------------------------------
# 📊 Health Check Settings
# ----------------------------------------
HEALTH_CHECK = {
    'DATABASE': True,
    'CACHE': True,
    'REDIS': True,
    'STORAGE': True,
}

# ----------------------------------------
# 🎯 Final Production Overrides
# ----------------------------------------

# Disable debug toolbar
DEBUG_TOOLBAR_CONFIG = {}

# Disable development-specific apps
if 'debug_toolbar' in INSTALLED_APPS:
    INSTALLED_APPS.remove('debug_toolbar')

# Ensure production middleware
if 'debug_toolbar.middleware.DebugToolbarMiddleware' in MIDDLEWARE:
    MIDDLEWARE.remove('debug_toolbar.middleware.DebugToolbarMiddleware')

# Production-specific apps
PRODUCTION_APPS = [
    'django_prometheus',  # Metrics for monitoring
]

INSTALLED_APPS += PRODUCTION_APPS

# Prometheus metrics
PROMETHEUS_EXPORT_MIGRATIONS = False 