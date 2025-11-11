"""
Django settings module - split into base, dev, and prod configurations.
Use DJANGO_SETTINGS_MODULE environment variable to select:
- new_concierge_backend.settings.dev (development)
- new_concierge_backend.settings.prod (production)

Or use DJANGO_ENV environment variable:
- DJANGO_ENV=production -> uses prod.py
- DJANGO_ENV=development (default) -> uses dev.py
"""

import os

# Default to dev if not set
DJANGO_ENV = os.getenv('DJANGO_ENV', os.getenv('ENV', 'development'))

if DJANGO_ENV == 'production':
    from .prod import *
else:
    from .dev import *
