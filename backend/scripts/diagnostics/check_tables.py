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
        # Check if projects tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'demo' 
            AND table_name LIKE 'projects_%'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        print('Projects tables in demo schema:')
        for table in tables:
            print(f'  - {table[0]}')
        
        if not tables:
            print('  No projects tables found!')
            
        # Check migration status
        cursor.execute("""
            SELECT app, name, applied 
            FROM django_migrations 
            WHERE app = 'projects'
            ORDER BY applied DESC;
        """)
        migrations = cursor.fetchall()
        
        print('\nProjects migrations status:')
        for migration in migrations:
            print(f'  - {migration[0]}.{migration[1]} (applied: {migration[2]})')
