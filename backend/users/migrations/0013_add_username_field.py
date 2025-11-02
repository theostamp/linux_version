# Generated migration for adding username field to CustomUser

from django.db import migrations, models
from django.core.validators import RegexValidator, MinLengthValidator
import re


def generate_username_from_email(email):
    """Generate a valid username from email address"""
    username = email.split('@')[0].lower()
    username = re.sub(r'[^a-z0-9-]', '', username)
    
    if len(username) < 3:
        username = f"user-{username}"
    
    return username[:30]


def migrate_existing_users_forward(apps, schema_editor):
    """
    Migrate existing users to have usernames.
    This function runs when applying the migration.
    """
    CustomUser = apps.get_model('users', 'CustomUser')
    
    # Get users without username
    users_to_migrate = CustomUser.objects.filter(username__isnull=True) | CustomUser.objects.filter(username='')
    total = users_to_migrate.count()
    
    if total == 0:
        print("No users to migrate (all have usernames)")
        return
    
    print(f"Migrating {total} users to have usernames...")
    
    updated = 0
    for user in users_to_migrate:
        try:
            # Generate base username
            base_username = generate_username_from_email(user.email)
            
            # Make it unique
            username = base_username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                suffix = f"-{counter}"
                max_base = 30 - len(suffix)
                username = f"{base_username[:max_base]}{suffix}"
                counter += 1
                
                if counter > 10000:
                    raise Exception(f"Could not generate unique username for {user.email}")
            
            # Update user
            user.username = username
            user.save(update_fields=['username'])
            print(f"  ✓ {user.email} → {username}")
            updated += 1
            
        except Exception as e:
            print(f"  ✗ Error migrating {user.email}: {e}")
    
    print(f"✅ Migrated {updated}/{total} users successfully")


def migrate_existing_users_backward(apps, schema_editor):
    """
    Reverse migration: Clear usernames.
    This function runs when reverting the migration.
    """
    CustomUser = apps.get_model('users', 'CustomUser')
    CustomUser.objects.all().update(username=None)
    print("Cleared all usernames")


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_add_stripe_and_tenant_fields'),  # Replace with your latest migration
    ]

    operations = [
        # Step 1: Add username field (nullable first, for existing users)
        migrations.AddField(
            model_name='customuser',
            name='username',
            field=models.CharField(
                max_length=30,
                null=True,  # Temporarily allow null for existing users
                blank=True,
                help_text='Unique username (3-30 characters, alphanumeric and hyphens only). Used as tenant subdomain.',
                validators=[
                    RegexValidator(
                        regex=r'^[a-z0-9-]+$',
                        message='Username can only contain lowercase letters, numbers, and hyphens',
                        code='invalid_username'
                    ),
                    MinLengthValidator(3, message='Username must be at least 3 characters long'),
                ],
            ),
        ),
        
        # Step 2: Migrate existing users to have usernames
        migrations.RunPython(
            migrate_existing_users_forward,
            migrate_existing_users_backward
        ),
        
        # Step 3: Make username required and unique (after all users have one)
        migrations.AlterField(
            model_name='customuser',
            name='username',
            field=models.CharField(
                max_length=30,
                unique=True,
                help_text='Unique username (3-30 characters, alphanumeric and hyphens only). Used as tenant subdomain.',
                validators=[
                    RegexValidator(
                        regex=r'^[a-z0-9-]+$',
                        message='Username can only contain lowercase letters, numbers, and hyphens',
                        code='invalid_username'
                    ),
                    MinLengthValidator(3, message='Username must be at least 3 characters long'),
                ],
                error_messages={
                    'unique': 'This username is already taken.',
                },
            ),
        ),
    ]

