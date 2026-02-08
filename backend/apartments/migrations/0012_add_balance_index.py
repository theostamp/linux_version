from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apartments', '0011_apartment_kiosk_token'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='apartment',
            index=models.Index(fields=['building', 'current_balance'], name='apt_bldg_balance_idx'),
        ),
    ]
