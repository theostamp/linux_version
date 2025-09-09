#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'maintenance_payment%' AND table_schema = 'demo';")
    tables = cursor.fetchall()
    
    print("Payment-related tables:")
    for table in tables:
        print(f"  - {table[0]}")
        
    if not tables:
        print("No payment tables found!")
        
        # Check all maintenance tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'maintenance_%' AND table_schema = 'demo';")
        all_tables = cursor.fetchall()
        
        print("\nAll maintenance tables:")
        for table in all_tables:
            print(f"  - {table[0]}")