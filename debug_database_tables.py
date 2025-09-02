#!/usr/bin/env python3
"""
Debug script to check what database tables actually exist
and find the correct table names for apartments and financial data
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def debug_database_tables():
    """Check what database tables actually exist"""
    print("🔍 DEBUGGING DATABASE TABLES...")
    print("=" * 60)
    
    with schema_context('demo'):
        print("📍 Using tenant schema: 'demo'")
        print()
        
        # 1. Check all tables in the current schema
        print("📊 CHECKING ALL DATABASE TABLES:")
        print("-" * 40)
        
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                # Get all table names in current schema
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'demo' 
                    ORDER BY table_name
                """)
                tables = cursor.fetchall()
                
                print(f"  ✅ Found {len(tables)} tables in 'demo' schema:")
                for table in tables:
                    print(f"    📋 {table[0]}")
                
        except Exception as e:
            print(f"  ❌ Error checking tables: {e}")
            return
        
        # 2. Check specific tables that might contain apartment data
        print("\n🏠 CHECKING APARTMENT-RELATED TABLES:")
        print("-" * 40)
        
        apartment_tables = [table[0] for table in tables if 'apartment' in table[0].lower() or 'building' in table[0].lower()]
        
        if apartment_tables:
            print(f"  ✅ Found {len(apartment_tables)} apartment-related tables:")
            for table in apartment_tables:
                print(f"    🏢 {table}")
        else:
            print("  ❌ No apartment-related tables found")
        
        # 3. Check financial tables
        print("\n💰 CHECKING FINANCIAL TABLES:")
        print("-" * 40)
        
        financial_tables = [table[0] for table in tables if 'financial' in table[0].lower() or 'expense' in table[0].lower() or 'payment' in table[0].lower()]
        
        if financial_tables:
            print(f"  ✅ Found {len(financial_tables)} financial tables:")
            for table in financial_tables:
                print(f"    💳 {table}")
        else:
            print("  ❌ No financial tables found")
        
        # 4. Check table structure for key tables
        print("\n🔍 CHECKING TABLE STRUCTURE:")
        print("-" * 40)
        
        # Check first apartment table if exists
        if apartment_tables:
            first_apt_table = apartment_tables[0]
            print(f"  📋 Structure of '{first_apt_table}':")
            
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = 'demo' AND table_name = '{first_apt_table}'
                        ORDER BY ordinal_position
                    """)
                    columns = cursor.fetchall()
                    
                    for col in columns:
                        print(f"    🏷️  {col[0]}: {col[1]}")
                        
            except Exception as e:
                print(f"    ❌ Error checking structure: {e}")
        
        # 5. Summary
        print("\n📋 SUMMARY:")
        print("-" * 40)
        print("  🔍 aptWithFinancial API returns previous_balance: 0€")
        print("  🔍 Dashboard API returns previous_obligations: 5000€")
        print("  🔍 Root cause: Apartment table missing or wrong name")
        print()
        print("  💡 Next steps:")
        print("    1. Check if apartment data is in different table")
        print("    2. Verify table names in Django models")
        print("    3. Check if migrations are applied")

if __name__ == "__main__":
    debug_database_tables()

