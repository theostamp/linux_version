# Generated manually for stripe_checkout_session_id field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0006_add_tenant_domain_to_subscription'),
    ]

    operations = [
        migrations.AddField(
            model_name='usersubscription',
            name='stripe_checkout_session_id',
            field=models.CharField(
                blank=True,
                help_text='Stripe checkout session ID for idempotency',
                max_length=255,
                unique=True
            ),
        ),
    ]
