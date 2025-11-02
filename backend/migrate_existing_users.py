#!/usr/bin/env python
"""
Migrate existing users to have usernames.
This script generates usernames for users who don't have one yet.
"""
import os
import sys
import django
import re

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from django.db import transaction

def generate_username_from_email(email):
    """Generate a valid username from email address"""
    # Extract username part (before @)
    username = email.split('@')[0].lower()
    
    # Remove all non-alphanumeric except hyphens
    username = re.sub(r'[^a-z0-9-]', '', username)
    
    # Ensure it's at least 3 characters
    if len(username) < 3:
        username = f"user-{username}"
    
    # Truncate to 30 characters
    username = username[:30]
    
    return username

def make_username_unique(base_username):
    """Ensure username is unique by adding a counter if needed"""
    username = base_username
    counter = 1
    
    while CustomUser.objects.filter(username=username).exists():
        # Add counter to make it unique
        suffix = f"-{counter}"
        max_base = 30 - len(suffix)
        username = f"{base_username[:max_base]}{suffix}"
        counter += 1
        
        # Safety limit
        if counter > 10000:
            raise Exception(f"Could not generate unique username for {base_username}")
    
    return username

print("=" * 80)
print("👥 Migrating Existing Users to Username-Based System")
print("=" * 80)
print()

# Find users without username
users_without_username = CustomUser.objects.filter(username__isnull=True) | CustomUser.objects.filter(username='')
total_users = users_without_username.count()

if total_users == 0:
    print("✅ All users already have usernames!")
    print()
    sys.exit(0)

print(f"📊 Found {total_users} users without usernames")
print()
print("Generating usernames...")
print("-" * 80)

updated_count = 0
errors = []

with transaction.atomic():
    for user in users_without_username:
        try:
            # Generate base username from email
            base_username = generate_username_from_email(user.email)
            
            # Make it unique
            unique_username = make_username_unique(base_username)
            
            # Update user
            user.username = unique_username
            user.save(update_fields=['username'])
            
            print(f"✓ {user.email:40} → {unique_username}")
            updated_count += 1
            
        except Exception as e:
            error_msg = f"✗ {user.email}: {str(e)}"
            print(error_msg)
            errors.append(error_msg)

print("-" * 80)
print()
print("=" * 80)
print(f"📊 Migration Summary")
print("=" * 80)
print(f"Total users processed: {total_users}")
print(f"Successfully updated: {updated_count}")
print(f"Errors: {len(errors)}")
print()

if errors:
    print("❌ Errors encountered:")
    for error in errors:
        print(f"  {error}")
    print()
    sys.exit(1)
else:
    print("✅ All users migrated successfully!")
    print()
    
    # Show some examples
    print("Example usernames created:")
    sample_users = CustomUser.objects.exclude(username__isnull=True).exclude(username='')[:5]
    for user in sample_users:
        print(f"  {user.email:40} → {user.username}")
    print()

