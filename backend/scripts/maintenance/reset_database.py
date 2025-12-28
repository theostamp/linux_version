#!/usr/bin/env python
"""
Script για επανεγκατάσταση της βάσης δεδομένων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import get_tenant_model, schema_exists
from django.db import connection

def reset_database():
    """Καθαρίζει τη βάση δεδομένων και την ξαναρχικοποιεί"""
    
    print("🧹 Καθαρισμός βάσης δεδομένων...")
    
    # Διαγραφή demo tenant αν υπάρχει
    TenantModel = get_tenant_model()
    
    if schema_exists('demo'):
        try:
            tenant = TenantModel.objects.get(schema_name='demo')
            tenant.delete()
            print("✅ Διαγράφηκε το demo tenant")
        except TenantModel.DoesNotExist:
            print("ℹ️ Το demo tenant δεν υπάρχει")
    
    # Διαγραφή schema demo αν υπάρχει
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA IF EXISTS demo CASCADE;")
        print("✅ Διαγράφηκε το demo schema")
    
    print("✅ Η βάση δεδομένων καθαρίστηκε")
    print("🚀 Εκτελέστε ξανά το auto_initialization.py")

if __name__ == "__main__":
    reset_database()
