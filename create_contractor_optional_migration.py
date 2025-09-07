#!/usr/bin/env python3
"""
Script to create migration for making contractor field optional in ServiceReceipt model
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.core.management import call_command

def create_migration():
    """Create migration for contractor field change"""
    print("Creating migration for ServiceReceipt contractor field...")
    
    with schema_context('demo'):
        try:
            # Create migration
            call_command('makemigrations', 'maintenance', '--name', 'make_contractor_optional')
            print("✅ Migration created successfully")
            
            # Apply migration
            call_command('migrate', 'maintenance')
            print("✅ Migration applied successfully")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    return True

if __name__ == '__main__':
    success = create_migration()
    if success:
        print("🎉 ServiceReceipt contractor field is now optional!")
    else:
        print("💥 Failed to update contractor field")
