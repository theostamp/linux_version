# Generated by Django 5.1.9 on 2025-05-23 11:18

from django.db import migrations, models  # type: ignore  # type: ignore


class Migration(migrations.Migration):

    dependencies = [
        ('announcements', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='is_active',
            field=models.BooleanField(default=False),
        ),
    ]
