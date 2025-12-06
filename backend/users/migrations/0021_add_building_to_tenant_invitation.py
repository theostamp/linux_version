# Generated manually for building context in invitations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0020_add_kiosk_registration_fields'),
    ]

    operations = [
        # Add building_id to TenantInvitation for building context
        # Using IntegerField because buildings are in tenant schema (cross-schema reference)
        migrations.AddField(
            model_name='tenantinvitation',
            name='building_id',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Optional: ID of the building this invitation is for'
            ),
        ),
        # Add apartment_id to TenantInvitation
        # Using IntegerField because apartments are in tenant schema (cross-schema reference)
        migrations.AddField(
            model_name='tenantinvitation',
            name='apartment_id',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Optional: ID of the apartment this invitation is for'
            ),
        ),
    ]
