# Generated by Django 5.0.14 on 2025-06-03 23:58

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('buildings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UrgentRequestLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('triggered_at', models.DateTimeField(auto_now_add=True)),
                ('supporter_count', models.PositiveIntegerField()),
            ],
        ),
        migrations.CreateModel(
            name='UserRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Σε εκκρεμότητα'), ('in_progress', 'Σε εξέλιξη'), ('completed', 'Ολοκληρωμένο'), ('rejected', 'Απορρίφθηκε')], default='pending', max_length=20)),
                ('type', models.CharField(blank=True, choices=[('maintenance', 'Συντήρηση'), ('cleaning', 'Καθαριότητα'), ('technical', 'Τεχνικό'), ('other', 'Άλλο')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_requests', to='buildings.building')),
            ],
        ),
    ]
