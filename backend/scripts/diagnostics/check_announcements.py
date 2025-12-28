#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from announcements.models import Announcement
from django.db import connection

print(f"Current schema: {connection.schema_name}")

try:
    with schema_context('demo'):
        count = Announcement.objects.count()
        print(f"Announcements in demo tenant: {count}")
        
        if count > 0:
            announcements = Announcement.objects.all()[:5]
            for a in announcements:
                print(f"- ID: {a.id}, Title: {a.title}, Building: {a.building_id}")
        else:
            print("No announcements found in demo tenant")
            
except Exception as e:
    print(f"Error: {e}") 