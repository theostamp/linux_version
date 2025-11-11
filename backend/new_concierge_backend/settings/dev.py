"""
Development settings - extends base.py
"""
from .base import *

# Development-specific overrides
DEBUG = True

# Development ALLOWED_HOSTS (more permissive for local development)
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",")
ALLOWED_HOSTS += [".localhost"]  # Allow any subdomain *.localhost
ALLOWED_HOSTS += ["backend"]  # Docker container hostname

# Development CSRF origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://demo.localhost:8080',
    'http://localhost:8000',
    'http://demo.localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://demo.localhost:3000',
]

# Development cookie settings
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

# Development CORS (more permissive)
CORS_ALLOWED_ORIGINS = get_list_env(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://demo.localhost:8080,"
    "http://top.localhost:8080,http://tap.localhost:8080,"
    "http://localhost:3000,http://127.0.0.1:3000,http://demo.localhost:3000,"
    "http://top.localhost:3000,http://tap.localhost:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,http://demo.localhost:3001,"
    "http://top.localhost:3001,http://tap.localhost:3001"
)

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[\w\-]+\.localhost:8080$",
    r"^http://[\w\-]+\.localhost:3000$",
    r"^http://[\w\-]+\.localhost:3001$",
]

# No proxy settings for development
USE_X_FORWARDED_HOST = False

