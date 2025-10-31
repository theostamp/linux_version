# Generated manually for Role System Refactoring

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_add_stripe_and_tenant_fields'),
    ]

    operations = [
        # Note: This migration documents the addition of 'superuser' to SystemRole enum
        # No database schema changes are required since TextChoices are not enforced at DB level.
        # The enum change is in the Python model code only.
        #
        # Valid SystemRole values:
        # - 'superuser': Ultra Admin (πρόσβαση σε όλο το project)
        # - 'admin': Ultra Admin (backward compat, same as superuser)
        # - 'manager': Django Tenant Owner (πρόσβαση μόνο στο tenant schema)
        #
        # Existing users with 'admin' remain valid.
        # New Ultra Admin users should use 'superuser'.
    ]

