import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

def check_celery_tables():
    print("Checking tables in 'demo' tenant schema:")
    with schema_context('demo'):
        with connection.cursor() as cursor:
            # Check if django_celery_beat tables exist
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'demo' 
                AND table_name LIKE 'django_celery_beat%'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            
            if tables:
                print("Found django_celery_beat tables in demo schema:")
                for table in tables:
                    print(f"  - {table[0]}")
            else:
                print("No django_celery_beat tables found in demo schema!")
                
            # Also check for django_celery_results tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'demo' 
                AND table_name LIKE 'django_celery_results%'
                ORDER BY table_name;
            """)
            
            result_tables = cursor.fetchall()
            
            if result_tables:
                print("\nFound django_celery_results tables in demo schema:")
                for table in result_tables:
                    print(f"  - {table[0]}")
            else:
                print("\nNo django_celery_results tables found in demo schema!")
    
    print("\nChecking tables in 'public' schema:")
    with connection.cursor() as cursor:
        # Check if django_celery_beat tables exist in public schema
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'django_celery_beat%'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            print("Found django_celery_beat tables in public schema:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("No django_celery_beat tables found in public schema!")
            
        # Also check for django_celery_results tables in public schema
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'django_celery_results%'
            ORDER BY table_name;
        """)
        
        result_tables = cursor.fetchall()
        
        if result_tables:
            print("\nFound django_celery_results tables in public schema:")
            for table in result_tables:
                print(f"  - {table[0]}")
        else:
            print("\nNo django_celery_results tables found in public schema!")

if __name__ == "__main__":
    check_celery_tables()
