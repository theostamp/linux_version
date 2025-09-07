import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import execute_from_command_line

print("Creating payment models migration...")
execute_from_command_line(['manage.py', 'makemigrations', 'maintenance', '--name', 'add_payment_models'])
print("Migration created successfully!")
