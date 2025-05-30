# Generated by Django 5.1.9 on 2025-05-14 08:32

import django.db.models.deletion  # type: ignore  # type: ignore
from django.conf import settings  # type: ignore  # type: ignore
from django.db import migrations, models  # type: ignore  # type: ignore


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('buildings', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Resident',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('apartment', models.CharField(max_length=50)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('role', models.CharField(choices=[('manager', 'Διαχειριστής'), ('owner', 'Ιδιοκτήτης'), ('tenant', 'Ένοικος')], default='tenant', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='residents', to='buildings.building')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='resident_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('building', 'apartment'),
                'unique_together': {('building', 'apartment')},
            },
        ),
    ]
