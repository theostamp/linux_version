# backend/new_concierge_backend/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv  
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
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY") or 'default_secret_key'  # Πρέπει να οριστεί στο .env
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY must be set in the environment variables.")
DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"

# 1️⃣  Δηλώνουμε τη λίστα
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

# 2️⃣  Προσθέτουμε το wildcard μόνο σε dev
if DEBUG:
    ALLOWED_HOSTS += [".localhost"]      # οποιοδήποτε sub-domain *.localhost
    ALLOWED_HOSTS += ["backend"]         # Docker container hostname

IS_PRODUCTION = os.getenv("ENV", "development") == "production"

# ----------------------------------------
# 🏘️ django-tenants split apps
# backend/new_concierge_backend/settings.py
# ----------------------------------------
SHARED_APPS = [
    'django_tenants',       # must be first
    'tenants',              # Client, Domain models
    'django.contrib.admin', # ✅ μεταφέρθηκε εδώ
    'django.contrib.auth',
    'users',

    'corsheaders',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

TENANT_APPS = [
    'rest_framework',
    'django_filters',

    'buildings',
    'apartments',
    'announcements',
    'user_requests',
    'votes',
    'residents',
    'obligations',
    'public_info',
    'core',
    'chat',
    
    # 🔧 Νέα apps για επέκταση λειτουργιών
    'maintenance',
    'projects',
    'todo_management',
    'events',
    
    # 📄 Document Parser
    'document_parser',
    
    # 💰 Οικονομικό σύστημα
    'financial',
    
    # 👥 Διαχείριση Ομάδων, Προμηθευτών & Συνεργατών
    'teams',
    'collaborators',
    
    # 🖥️ Kiosk Widget Management
    'kiosk',
    
    # 🔄 AI Data Migration
    'data_migration',
    
    # 🔗 Integrations
    'integrations',
]


INSTALLED_APPS = SHARED_APPS + [app for app in TENANT_APPS if app not in SHARED_APPS]

# Performance & Monitoring
if DEBUG:
    # Only add debug tools if they're available
    debug_apps = []
    
    try:
        import debug_toolbar
        debug_apps.append('debug_toolbar')
    except ImportError:
        pass
    
    try:
        import django_extensions
        debug_apps.append('django_extensions')
    except ImportError:
        pass
    
    
    
    INSTALLED_APPS += debug_apps
    
    MIDDLEWARE = [
        'corsheaders.middleware.CorsMiddleware',
        'core.middleware.CustomTenantMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'financial.audit.AuditMiddleware',  # Audit logging για οικονομικές κινήσεις
    ]
    
    if 'debug_toolbar' in INSTALLED_APPS:
        MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    
else:
    MIDDLEWARE = [
        'corsheaders.middleware.CorsMiddleware',
        'core.middleware.CustomTenantMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'financial.audit.AuditMiddleware',  # Audit logging για οικονομικές κινήσεις
    ]

# Debug Toolbar Configuration
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

 

 

# Cache Configuration
TENANT_SCHEMA_NAME = os.getenv('TENANT_SCHEMA_NAME', 'demo')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f"redis://{os.getenv('REDIS_HOST', 'redis')}:{os.getenv('REDIS_PORT', '6379')}/1",
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': f"{TENANT_SCHEMA_NAME}_cache",
        'TIMEOUT': 300,  # 5 minutes default
    }
}

 

# Database Connection Pooling
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.getenv('DB_NAME', os.getenv('POSTGRES_DB', 'postgres')),
        'USER': os.getenv('DB_USER', os.getenv('POSTGRES_USER', 'postgres')),
        'PASSWORD': os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD', 'postgres')),
        'HOST': os.getenv('DB_HOST', os.getenv('POSTGRES_HOST', 'localhost')),
        'PORT': os.getenv('DB_PORT', os.getenv('POSTGRES_PORT', '5432')),
        'CONN_MAX_AGE': 600,  # 10 minutes
    }
}

DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)
TENANT_MODEL = 'tenants.Client'
TENANT_DOMAIN_MODEL = 'tenants.Domain'
PUBLIC_SCHEMA_NAME = 'public'

# ----------------------------------------
# 🔑 Custom auth
# ----------------------------------------

AUTH_USER_MODEL = 'users.CustomUser'  # Προσαρμοσμένο μοντέλο χρήστη

# ----------------------------------------
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
# 🌐 URL Configuration
# ----------------------------------------
# Tenant URLs and Public schema URLs
ROOT_URLCONF = 'new_concierge_backend.urls'
PUBLIC_SCHEMA_URLCONF = 'new_concierge_backend.public_urls'

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
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FileUploadParser',
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
        'anon': '1000/hour',  # 1000 requests per hour for anonymous users
        'user': '10000/hour',  # 10000 requests per hour for authenticated users
    },
}

# ----------------------------------------
# 🌐 CORS
# ----------------------------------------
CORS_ALLOW_CREDENTIALS = True     # για cookies / JWT
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://demo.localhost:8080",
    "http://top.localhost:8080",  # Προσθήκη του συγκεκριμένου subdomain
    "http://tap.localhost:8080",  # Προσθήκη του tap subdomain
    # ✅ Next.js default dev port
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://demo.localhost:3000",
    "http://top.localhost:3000",
    "http://tap.localhost:3000",
    # ✅ Port 3001 για το frontend
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://demo.localhost:3001",
    "http://top.localhost:3001",
    "http://tap.localhost:3001",
]  # τα «σκέτα» origins

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[\w\-]+\.localhost:8080$",
    r"^http://[\w\-]+\.localhost:3000$",
    r"^http://[\w\-]+\.localhost:3001$",
]  # ✅ Ο *οποιοσδήποτε* sub-domain *.localhost:8080

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://*.localhost:8080",
    "http://top.localhost:8080",  # Προσθήκη του συγκεκριμένου subdomain
    "http://tap.localhost:8080",  # Προσθήκη του tap subdomain
]

CORS_EXPOSE_HEADERS  = ["Content-Type", "X-CSRFToken"]
CORS_ALLOW_HEADERS = get_list_env(
    "CORS_ALLOW_HEADERS",
    "accept,accept-encoding,authorization,content-type,dnt,origin,"
    "user-agent,x-csrftoken,x-requested-with,x-xsrf-token,"
    "x-toast-suppress,x-toast-success,x-toast-error"
)

CORS_ALLOW_METHODS   = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

# ----------------------------------------
# 🔒 CSRF
# ----------------------------------------
_raw_csrf = get_list_env(
    "CSRF_ORIGINS",
    # ✅ Cover common dev hosts and ports by default
    "localhost:8080,localhost:3000,127.0.0.1:8080,127.0.0.1:3000,"
    "demo.localhost:8080,demo.localhost:3000,"
    "top.localhost:8080,tap.localhost:8080,top.localhost:3000,tap.localhost:3000"
)
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
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),  # Αυξήθηκε από 1 σε 30 λεπτά
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

# ----------------------------------------
# 🔌 Django Channels & WebSocket
# ----------------------------------------
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(os.getenv('REDIS_HOST', 'redis'), int(os.getenv('REDIS_PORT', '6379')))],
        },
    },
}

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

# Prometheus Metrics (Production)
if not DEBUG:
    INSTALLED_APPS += ['django_prometheus']
    MIDDLEWARE = ['django_prometheus.middleware.PrometheusBeforeMiddleware'] + MIDDLEWARE
    MIDDLEWARE += ['django_prometheus.middleware.PrometheusAfterMiddleware']

# ----------------------------------------
# 📅 Google Calendar Integration Settings
# ----------------------------------------
GOOGLE_CALENDAR_ENABLED = os.getenv('GOOGLE_CALENDAR_ENABLED', 'False') == 'True'

# OAuth 2.0 credentials (για admin authentication)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

# ----------------------------------------
# 🤖 Google Document AI Settings
# ----------------------------------------
GOOGLE_CLOUD_PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT_ID', '')
GOOGLE_CLOUD_LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us')
GOOGLE_DOCUMENT_AI_PROCESSOR_ID = os.getenv('GOOGLE_DOCUMENT_AI_PROCESSOR_ID', '')

# ----------------------------------------
# 🔄 Celery Settings
# ----------------------------------------
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://demo.localhost:8000/auth/google/callback')

# Service Account για server-to-server API calls
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE', BASE_DIR / 'credentials' / 'google-service-account.json')

# Admin account που θα χρησιμοποιηθεί για calendar management
GOOGLE_ADMIN_EMAIL = os.getenv('GOOGLE_ADMIN_EMAIL', '')

# Google Calendar API settings
GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
]

# Frontend URL για links στα Google Calendar events
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://demo.localhost:3001')

# Calendar sync settings
GOOGLE_CALENDAR_SYNC_ENABLED = os.getenv('GOOGLE_CALENDAR_SYNC_ENABLED', 'True') == 'True'
GOOGLE_CALENDAR_AUTO_SHARE = os.getenv('GOOGLE_CALENDAR_AUTO_SHARE', 'True') == 'True'
