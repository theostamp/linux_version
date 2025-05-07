import os
import django
from django.core.exceptions import ImproperlyConfigured

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.contrib.auth import get_user_model

email = os.getenv("DJANGO_SUPERUSER_EMAIL")
password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
first_name = os.getenv("DJANGO_SUPERUSER_FIRSTNAME", "Admin")
last_name = os.getenv("DJANGO_SUPERUSER_LASTNAME", "User")

if not all([email, password]):
    raise ImproperlyConfigured("❌ Missing DJANGO_SUPERUSER_EMAIL or PASSWORD")

User = get_user_model()

if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    print(f"✅ Superuser '{email}' created.")
else:
    print(f"ℹ️ Superuser '{email}' already exists.")
