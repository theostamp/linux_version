# Generated by Django 5.2.4 on 2025-07-26 04:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apartments', '0002_apartment_owner_phone2_apartment_tenant_phone2'),
    ]

    operations = [
        migrations.AddField(
            model_name='apartment',
            name='identifier',
            field=models.CharField(blank=True, help_text='π.χ. Α2, Β1, C3', max_length=20, verbose_name='Διακριτικό Διαμερίσματος'),
        ),
    ]
