import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
from django.core.management import call_command

with schema_context('demo'):
    with connection.cursor() as cursor:
        print("Dropping existing projects tables...")
        
        # Drop tables in correct order (respect foreign keys)
        tables_to_drop = [
            'projects_projectexpense',
            'projects_projectvote', 
            'projects_offerfile',
            'projects_offer',
            'projects_rfq',
            'projects_milestone',
            'projects_contract',
            'projects_project'
        ]
        
        for table in tables_to_drop:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                print(f"  - Dropped {table}")
            except Exception as e:
                print(f"  - Could not drop {table}: {e}")
        
        # Remove migration records
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'projects';
        """)
        print(f"\nCleared migration records for projects app")
        
        connection.commit()
        print("\nDatabase cleanup complete!")

print("\nCreating new migrations...")
call_command('makemigrations', 'projects', verbosity=2)

print("\nApplying migrations...")
with schema_context('demo'):
    call_command('migrate', 'projects', verbosity=2)

print("\nVerifying new schema...")
with schema_context('demo'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'demo' 
            AND table_name = 'projects_offer'
            AND column_name IN ('submitted_at', 'reviewed_at', 'submitted_date', 'evaluation_date')
            ORDER BY column_name;
        """)
        print("\nOffer table date columns:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]}")

print("\nDone!")
