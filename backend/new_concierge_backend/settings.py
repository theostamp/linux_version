import os
from pathlib import Path
from dotenv import load_dotenv  # type: ignore
from datetime import timedelta

load_dotenv()

# Helper για μετατροπή από string -> list
def get_list_env(var_name, default=""):
    return [v.strip() for v in os.getenv(var_name, default).split(",") if v.strip()]

# ----------------------------------------
# 📁 Paths & Base
# ----------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ----------------------------------------
# 🔐 Security
# ----------------------------------------
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure_dev_key')
DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost').split(',')
IS_PRODUCTION = os.getenv('ENV', 'development') == 'production'


# ----------------------------------------
# 🏘️ django-tenants split apps
# ----------------------------------------
SHARED_APPS = [
    'django_tenants',       # For django-tenants
    'tenants',              # App for managing Client and Domain models (tenant metadata)

    # Django's own apps, generally shared
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',

    # Your apps that need to be in the public schema
    'users',
    'buildings',
    'announcements',
    'user_requests',
    'votes',
    'residents',     # Αν οι residents είναι global ή συνδέονται από το public
    'obligations',   # Μεταφέρθηκε εδώ, υποθέτοντας ότι είναι shared
]

TENANT_APPS = [
    # Django REST framework and related tools, often per-tenant if APIs are tenant-specific
    'rest_framework',
    'corsheaders',
    'django_filters',

    # Your apps that are specific to each tenant
    'core',                 # Assuming core tenant-specific logic
    # 'residents',          # Αφαιρέθηκε αν μεταφέρθηκε στις SHARED_APPS
    # 'obligations',        # Αφαιρέθηκε καθώς μεταφέρθηκε στις SHARED_APPS
]

# Ensure no app is listed in both SHARED_APPS and TENANT_APPS if you modify them further.
# The following line correctly combines them for INSTALLED_APPS.
INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]
# ----------------------------------------
# 🧩 Middleware
# ----------------------------------------
MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ----------------------------------------
# 🌐 URL / WSGI / ASGI
# ----------------------------------------
ROOT_URLCONF = 'new_concierge_backend.urls'
WSGI_APPLICATION = 'new_concierge_backend.wsgi.application'
ASGI_APPLICATION = 'new_concierge_backend.asgi.application'

# ----------------------------------------
# 🗄️ Database
# ----------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.getenv('DB_NAME', os.getenv('POSTGRES_DB', 'postgres')),
        'USER': os.getenv('DB_USER', os.getenv('POSTGRES_USER', 'postgres')),
        'PASSWORD': os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD', 'postgres')),
        'HOST': os.getenv('DB_HOST', os.getenv('POSTGRES_HOST', 'db')),
        'PORT': os.getenv('DB_PORT', os.getenv('POSTGRES_PORT', '5432')),
    }
}

DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)
TENANT_MODEL = 'tenants.Client'
TENANT_DOMAIN_MODEL = 'tenants.Domain'
PUBLIC_SCHEMA_NAME = 'public'

# ----------------------------------------
# 🔑 Custom auth
# ----------------------------------------
AUTH_USER_MODEL = 'users.CustomUser'
AUTHENTICATION_BACKENDS = [
    'users.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ----------------------------------------
# 🌍 i18n / l10n / tz
# ----------------------------------------
LANGUAGE_CODE = 'el-gr'
TIME_ZONE = 'Europe/Athens'
USE_I18N = True
USE_TZ = True

# ----------------------------------------
# 📦 Static / Media
# ----------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = Path(os.getenv('STATIC_ROOT', BASE_DIR / 'staticfiles'))
MEDIA_ROOT = Path(os.getenv('MEDIA_ROOT', BASE_DIR / 'media'))
MEDIA_URL = '/media/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ----------------------------------------
# ⚙️ Templates
# ----------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],  # ✅ Προστέθηκε
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ----------------------------------------
# 🛡️ REST Framework
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
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'NON_FIELD_ERRORS_KEY': 'error',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/day',
        'user': '1000/day',
    },
}

# ----------------------------------------
# 🌐 CORS
# ----------------------------------------
# στο settings.py

# CORS SETTINGS
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = get_list_env("CORS_ALLOWED_ORIGINS")
CORS_ALLOWED_ORIGIN_REGEXES = get_list_env("CORS_ALLOWED_ORIGIN_REGEXES")
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']

# CSRF SETTINGS
CSRF_TRUSTED_ORIGINS = get_list_env("CSRF_TRUSTED_ORIGINS")
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SECURE = False if not IS_PRODUCTION else True

# ----------------------------------------
# 🔒 CSRF
# ----------------------------------------
_raw_csrf = get_list_env("CSRF_ORIGINS", "localhost:3000")
CSRF_TRUSTED_ORIGINS = [f"http://{h}" for h in _raw_csrf] + [f"https://{h}" for h in _raw_csrf]

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False
if IS_PRODUCTION:
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE = 'None'
else:
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', 'Lax')

# ----------------------------------------
# 📧 Email
# ----------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@example.com')

# ----------------------------------------
# Django REST framework simple JWT settings
# ----------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=1),  # π.χ. 30 λεπτά
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,

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
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=30),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# Debug unsafe (για dev περιβάλλον)
DJANGO_ALLOW_ASYNC_UNSAFE = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
}

