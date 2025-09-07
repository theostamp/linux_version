#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.core.management import call_command

with schema_context('demo'):
    print("Creating migration for payment models...")
    call_command('makemigrations', 'maintenance', name='add_payment_models', verbosity=2)
    print("Migration created successfully!")
