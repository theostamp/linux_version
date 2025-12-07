import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser

try:
    user = CustomUser.objects.get(email='thodoris_st@hotmail.com')
    print(f"User: {user.email}")
    print(f"Role: {user.role}")
    print(f"Tenant: {user.tenant}")
    if user.tenant:
        print(f"Tenant schema: {user.tenant.schema_name}")
        print(f"Expected URL: {user.tenant.schema_name}.newconcierge.app")
except Exception as e:
    print(f"Error: {e}")
