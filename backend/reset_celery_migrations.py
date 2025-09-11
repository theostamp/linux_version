import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def reset_celery_migrations():
    """
    Reset and properly apply Celery Beat migrations to public schema.
    """
    print("Resetting Celery Beat migrations...")
    
    with connection.cursor() as cursor:
        # First, drop the manually created tables
        print("Dropping manually created tables...")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_periodictask CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_periodictasks CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_crontabschedule CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_intervalschedule CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_clockedschedule CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_beat_solarschedule CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_results_taskresult CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_results_chordcounter CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS django_celery_results_groupresult CASCADE;")
        
        # Remove migration records for these apps
        print("Removing migration records...")
        cursor.execute("DELETE FROM django_migrations WHERE app IN ('django_celery_beat', 'django_celery_results');")
        
        print("✅ Tables and migration records removed.")
    
    # Now run migrations properly
    print("Running migrations for public schema...")
    try:
        # Run migrations without tenant context
        execute_from_command_line(['manage.py', 'migrate', 'django_celery_beat', '--database=default'])
        execute_from_command_line(['manage.py', 'migrate', 'django_celery_results', '--database=default'])
        print("✅ Migrations completed successfully!")
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        return False
    
    # Verify tables were created
    print("\nVerifying tables...")
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
            print("✅ Successfully created tables in public schema:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Check if the one_off column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'django_celery_beat_periodictask'
                AND column_name = 'one_off';
            """)
            
            one_off_column = cursor.fetchone()
            if one_off_column:
                print("✅ one_off column exists in django_celery_beat_periodictask")
            else:
                print("❌ one_off column missing from django_celery_beat_periodictask")
                
        else:
            print("❌ No Celery tables found in public schema!")
            return False
    
    return True

if __name__ == "__main__":
    success = reset_celery_migrations()
    if success:
        print("\n🎉 Celery Beat migrations fixed successfully!")
    else:
        print("\n❌ Failed to fix Celery Beat migrations!")
