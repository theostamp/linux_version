import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

with schema_context('demo'):
    with connection.cursor() as cursor:
        # Check Offer table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'demo' 
            AND table_name = 'projects_offer'
            ORDER BY ordinal_position;
        """)
        print("Offer table columns:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
        
        print("\nProject table columns:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'demo' 
            AND table_name = 'projects_project'
            ORDER BY ordinal_position;
        """)
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")
