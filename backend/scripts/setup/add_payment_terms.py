import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django.db import connection

# Check if payment_terms field exists
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'demo' 
        AND table_name = 'maintenance_scheduledmaintenance'
        AND column_name = 'payment_terms'
    """)
    result = cursor.fetchone()
    
    if result:
        print("✅ payment_terms field already exists in ScheduledMaintenance")
    else:
        print("❌ payment_terms field does NOT exist in ScheduledMaintenance")
        print("Need to add it to the model and run migrations")

# Check existing fields
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'demo' 
        AND table_name = 'maintenance_scheduledmaintenance'
        AND column_name IN ('payment_method', 'installments', 'advance_payment', 'contractor_contact', 'contractor_phone', 'contractor_email', 'total_cost')
        ORDER BY column_name
    """)
    results = cursor.fetchall()
    
    print("\n📋 Existing payment and contractor fields:")
    for col_name, data_type, max_length in results:
        print(f"  - {col_name}: {data_type}{f'({max_length})' if max_length else ''}")
