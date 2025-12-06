# Generated manually for building context in invitations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0020_add_kiosk_registration_fields'),
        ('apartments', '0011_apartment_kiosk_token'),
    ]

    operations = [
        # Add building_id to TenantInvitation for building context
        migrations.AddField(
            model_name='tenantinvitation',
            name='building_id',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Optional: ID of the building this invitation is for'
            ),
        ),
        # Add apartment ForeignKey to TenantInvitation
        migrations.AddField(
            model_name='tenantinvitation',
            name='apartment',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tenant_invitations',
                to='apartments.apartment',
                help_text='Optional: Assign user to specific apartment'
            ),
        ),
    ]

