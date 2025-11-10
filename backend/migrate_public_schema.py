import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection
from django_tenants.utils import schema_context

def migrate_public_schema():
    """
    Run migrations for Celery Beat tables in the public schema.
    This is needed because Celery Beat runs in public schema context,
    not within tenant schemas.
    """
    print("Running migrations for public schema...")
    
    # Run migrations without tenant context (public schema)
    with connection.cursor() as cursor:
        # First, let's check what schemas exist
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schema_name;
        """)
        
        schemas = cursor.fetchall()
        print("Available schemas:")
        for schema in schemas:
            print(f"  - {schema[0]}")
    
    # Run migrations for django_celery_beat and django_celery_results
    # These need to be in the public schema for Celery Beat to work
    print("\nRunning migrations for django_celery_beat...")
    execute_from_command_line(['manage.py', 'migrate', 'django_celery_beat', '--database=default'])
    
    print("Running migrations for django_celery_results...")
    execute_from_command_line(['manage.py', 'migrate', 'django_celery_results', '--database=default'])
    
    # Verify the tables were created
    print("\nVerifying tables in public schema...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'django_celery_beat%' OR table_name LIKE 'django_celery_results%')
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            print("Successfully created tables in public schema:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("No Celery tables found in public schema!")

if __name__ == "__main__":
    migrate_public_schema()
