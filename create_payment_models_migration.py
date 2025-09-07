#!/usr/bin/env python3
"""
Script to create Django migration for new payment models
Must be run inside Docker container with proper Django setup
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

def create_payment_models_migration():
    """Create migration for new payment models"""
    
    print("🔄 Creating migration for new payment models...")
    
    with schema_context('demo'):
        try:
            # Create migration for maintenance app
            call_command(
                'makemigrations', 
                'maintenance',
                name='add_payment_models',
                verbosity=2
            )
            print("✅ Migration created successfully!")
            
            # Show migration status
            print("\n📋 Migration status:")
            call_command('showmigrations', 'maintenance', verbosity=1)
            
        except Exception as e:
            print(f"❌ Error creating migration: {e}")
            return False
    
    return True

if __name__ == '__main__':
    success = create_payment_models_migration()
    if success:
        print("\n🎯 Next steps:")
        print("1. Review the generated migration file")
        print("2. Run: docker exec -it linux_version-backend-1 python manage.py migrate")
        print("3. Test the new models in Django admin")
    else:
        print("\n❌ Migration creation failed!")
        sys.exit(1)
