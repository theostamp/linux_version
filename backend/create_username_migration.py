#!/usr/bin/env python
"""
Generate database migration for username field.
This script creates the migration file for adding username to CustomUser model.
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import call_command

print("=" * 80)
print("📝 Creating Database Migration for Username Field")
print("=" * 80)
print()

try:
    # Create migration
    print("🔧 Running makemigrations for users app...")
    call_command('makemigrations', 'users', verbosity=2)
    
    print()
    print("=" * 80)
    print("✅ Migration created successfully!")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Review the migration file in backend/users/migrations/")
    print("2. Run: docker exec -it linux_version-backend-1 python manage.py migrate")
    print()
    
except Exception as e:
    print(f"❌ Error creating migration: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

