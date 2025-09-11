import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def fix_celery_migrations():
    """
    Fix Celery Beat migrations by creating tables in public schema.
    Since the apps were moved from TENANT_APPS to SHARED_APPS,
    we need to create the tables in the public schema.
    """
    print("Fixing Celery Beat migrations...")
    
    with connection.cursor() as cursor:
        # Check current state
        print("Checking current state...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'django_celery_beat%' OR table_name LIKE 'django_celery_results%')
            ORDER BY table_name;
        """)
        
        existing_tables = cursor.fetchall()
        if existing_tables:
            print("Found existing tables in public schema:")
            for table in existing_tables:
                print(f"  - {table[0]}")
        else:
            print("No Celery tables found in public schema.")
        
        # Check migration state
        cursor.execute("""
            SELECT app, name 
            FROM django_migrations 
            WHERE app IN ('django_celery_beat', 'django_celery_results')
            ORDER BY app, name;
        """)
        
        migrations = cursor.fetchall()
        if migrations:
            print("\nFound migration records:")
            for migration in migrations:
                print(f"  - {migration[0]}: {migration[1]}")
        else:
            print("\nNo migration records found for Celery apps.")
        
        # If tables don't exist in public schema, we need to create them
        if not existing_tables:
            print("\nCreating Celery Beat tables in public schema...")
            
            # Create django_celery_beat tables
            print("Creating django_celery_beat tables...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_crontabschedule (
                    id SERIAL PRIMARY KEY,
                    minute VARCHAR(240) NOT NULL,
                    hour VARCHAR(96) NOT NULL,
                    day_of_week VARCHAR(64) NOT NULL,
                    day_of_month VARCHAR(124) NOT NULL,
                    month_of_year VARCHAR(64) NOT NULL,
                    timezone VARCHAR(63) NOT NULL DEFAULT 'UTC'
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_intervalschedule (
                    id SERIAL PRIMARY KEY,
                    every INTEGER NOT NULL,
                    period VARCHAR(24) NOT NULL
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_clockedschedule (
                    id SERIAL PRIMARY KEY,
                    clocked_time TIMESTAMP WITH TIME ZONE NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_solarschedule (
                    id SERIAL PRIMARY KEY,
                    event VARCHAR(24) NOT NULL,
                    latitude DECIMAL(9, 6) NOT NULL,
                    longitude DECIMAL(9, 6) NOT NULL
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_periodictask (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200) NOT NULL UNIQUE,
                    task VARCHAR(200) NOT NULL,
                    interval_id INTEGER REFERENCES django_celery_beat_intervalschedule(id),
                    crontab_id INTEGER REFERENCES django_celery_beat_crontabschedule(id),
                    solar_id INTEGER REFERENCES django_celery_beat_solarschedule(id),
                    clocked_id INTEGER REFERENCES django_celery_beat_clockedschedule(id),
                    args TEXT NOT NULL DEFAULT '[]',
                    kwargs TEXT NOT NULL DEFAULT '{}',
                    queue VARCHAR(200),
                    exchange VARCHAR(200),
                    routing_key VARCHAR(200),
                    expires TIMESTAMP WITH TIME ZONE,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    last_run_at TIMESTAMP WITH TIME ZONE,
                    total_run_count INTEGER NOT NULL DEFAULT 0,
                    date_changed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    description TEXT NOT NULL DEFAULT '',
                    start_time TIMESTAMP WITH TIME ZONE,
                    priority INTEGER,
                    headers TEXT NOT NULL DEFAULT '{}',
                    clocked_schedule_id INTEGER REFERENCES django_celery_beat_clockedschedule(id),
                    expire_seconds INTEGER
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_beat_periodictasks (
                    ident SMALLINT NOT NULL PRIMARY KEY DEFAULT 1,
                    last_update TIMESTAMP WITH TIME ZONE NOT NULL,
                    CONSTRAINT django_celery_beat_periodictasks_ident_check CHECK (ident = 1)
                );
            """)
            
            # Create django_celery_results tables
            print("Creating django_celery_results tables...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_results_taskresult (
                    id SERIAL PRIMARY KEY,
                    task_id VARCHAR(255) NOT NULL UNIQUE,
                    status VARCHAR(50) NOT NULL,
                    content_type VARCHAR(128) NOT NULL,
                    content_encoding VARCHAR(64) NOT NULL,
                    result BYTEA,
                    date_done TIMESTAMP WITH TIME ZONE NOT NULL,
                    traceback TEXT,
                    hidden BOOLEAN NOT NULL DEFAULT FALSE,
                    meta BYTEA,
                    task_args BYTEA,
                    task_kwargs BYTEA,
                    task_name VARCHAR(255),
                    worker VARCHAR(100),
                    date_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    date_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_results_chordcounter (
                    id SERIAL PRIMARY KEY,
                    group_id VARCHAR(255) NOT NULL,
                    sub_tasks TEXT NOT NULL,
                    count INTEGER NOT NULL DEFAULT 0
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS django_celery_results_groupresult (
                    id SERIAL PRIMARY KEY,
                    group_id VARCHAR(255) NOT NULL UNIQUE,
                    date_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    date_done TIMESTAMP WITH TIME ZONE,
                    content_type VARCHAR(128) NOT NULL,
                    content_encoding VARCHAR(64) NOT NULL,
                    result BYTEA
                );
            """)
            
            print("✅ Celery Beat tables created successfully!")
        
        # Verify tables were created
        print("\nVerifying tables...")
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
        else:
            print("❌ No Celery tables found in public schema!")

if __name__ == "__main__":
    fix_celery_migrations()
