# Generated migration for kiosk_token field
import uuid
from django.db import migrations, models


def generate_tokens(apps, schema_editor):
    """Generate unique tokens for existing apartments"""
    Apartment = apps.get_model('apartments', 'Apartment')
    for apartment in Apartment.objects.all():
        apartment.kiosk_token = uuid.uuid4()
        apartment.save(update_fields=['kiosk_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('apartments', '0010_apartment_previous_balance'),
    ]

    operations = [
        # Add field without unique constraint first
        migrations.AddField(
            model_name='apartment',
            name='kiosk_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        # Generate tokens for existing records
        migrations.RunPython(generate_tokens, migrations.RunPython.noop),
        # Now make it unique
        migrations.AlterField(
            model_name='apartment',
            name='kiosk_token',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                verbose_name='Kiosk Access Token',
                help_text='Μοναδικό token για QR code access στο personal dashboard'
            ),
        ),
    ]
