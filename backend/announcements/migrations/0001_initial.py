# Generated by Django 5.1.9 on 2025-05-13 23:56

import django.db.models.deletion  # type: ignore  # type: ignore
from django.db import migrations, models  # type: ignore  # type: ignore


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('buildings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Announcement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('file', models.FileField(blank=True, null=True, upload_to='announcements/')),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('published', models.BooleanField(default=False)),
                ('is_urgent', models.BooleanField(default=False)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='announcements', to='buildings.building')),
            ],
        ),
    ]
