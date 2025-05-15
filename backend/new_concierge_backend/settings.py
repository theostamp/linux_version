import os
from pathlib import Path
from dotenv import load_dotenv  # type: ignore

load_dotenv()

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
    'django_tenants',
    'tenants',

    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',

    'users',
    'buildings',
]

TENANT_APPS = [
    'rest_framework',
    'corsheaders',
    'django_filters',
    'announcements',
    'user_requests',
    'votes',
    'obligations',
    'core',
    'residents',
]

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
        'DIRS': [],
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
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt',
    'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
]
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']

# ----------------------------------------
# 🔒 CSRF
# ----------------------------------------
_raw_csrf = os.getenv('CSRF_ORIGINS', 'localhost:3000').split(',')
CSRF_TRUSTED_ORIGINS = [f'http://{h.strip()}' for h in _raw_csrf] + \
                       [f'https://{h.strip()}' for h in _raw_csrf] + \
                       ['http://localhost:3000']

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False
if IS_PRODUCTION:
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE = 'None'
else:
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE = 'Lax'

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

# Debug unsafe (για dev περιβάλλον)
DJANGO_ALLOW_ASYNC_UNSAFE = True
