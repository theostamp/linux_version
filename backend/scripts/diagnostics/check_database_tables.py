#!/usr/bin/env python3
"""
Check database tables and tenants
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection

def check_database():
    """Check what tables exist in the database"""
    print("🔍 Checking Database Schema...")
    print("=" * 50)
    
    try:
        with connection.cursor() as cursor:
            # Get database name
            print(f"Database: {connection.settings_dict['NAME']}")
            
            # Check if this is a tenant setup
            print("\n1. Checking tenant schema...")
            cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name;")
            schemas = cursor.fetchall()
            print(f"Available schemas: {[s[0] for s in schemas]}")
            
            # Check current search path
            cursor.execute("SHOW search_path;")
            search_path = cursor.fetchone()[0]
            print(f"Current search_path: {search_path}")
            
            # Check for apartments table
            print("\n2. Checking for apartments table...")
            cursor.execute("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE '%apartment%' 
                ORDER BY table_schema, table_name;
            """)
            apartment_tables = cursor.fetchall()
            
            if apartment_tables:
                print("Found apartment-related tables:")
                for schema, table in apartment_tables:
                    print(f"  {schema}.{table}")
            else:
                print("❌ No apartment tables found!")
            
            # Check all tables in current schema
            print("\n3. Checking all tables in current schema...")
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = current_schema()
                ORDER BY table_name;
            """)
            current_tables = cursor.fetchall()
            print(f"Tables in current schema ({len(current_tables)} total):")
            for table in current_tables[:20]:  # Show first 20
                print(f"  {table[0]}")
            if len(current_tables) > 20:
                print(f"  ... and {len(current_tables) - 20} more")
                
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_database()
