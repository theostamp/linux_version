import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from django.core.management import call_command

print("Applying migrations to demo schema...")
with schema_context('demo'):
    call_command('migrate', 'projects', verbosity=2)

print("\nVerifying new schema...")
with schema_context('demo'):
    with connection.cursor() as cursor:
        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'demo' 
            AND table_name LIKE 'projects_%'
            ORDER BY table_name;
        """)
        print("\nProjects tables:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}")
        
        # Check Offer columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'demo' 
            AND table_name = 'projects_offer'
            AND column_name IN ('submitted_at', 'reviewed_at')
            ORDER BY column_name;
        """)
        print("\nOffer date columns:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]}")

print("\nDone!")
