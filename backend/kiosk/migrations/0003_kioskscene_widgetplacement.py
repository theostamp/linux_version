# Generated migration for Kiosk Scenes architecture

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('buildings', '0001_initial'),  # Adjust based on your buildings app migration
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('kiosk', '0002_kioskdisplaysettings_kioskwidget_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='KioskScene',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('order', models.PositiveIntegerField(default=0)),
                ('duration_seconds', models.PositiveIntegerField(default=30, help_text='Duration in seconds')),
                ('transition', models.CharField(default='fade', help_text='Transition type (fade, slide, etc.)', max_length=50)),
                ('is_enabled', models.BooleanField(default=True)),
                ('active_start_time', models.TimeField(blank=True, help_text='Scene active from this time', null=True)),
                ('active_end_time', models.TimeField(blank=True, help_text='Scene active until this time', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('building', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='kiosk_scenes', to='buildings.building')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'kiosk_scenes',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='WidgetPlacement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('grid_row_start', models.PositiveIntegerField(help_text='Starting row in grid (1-indexed)')),
                ('grid_col_start', models.PositiveIntegerField(help_text='Starting column in grid (1-indexed)')),
                ('grid_row_end', models.PositiveIntegerField(help_text='Ending row in grid (1-indexed)')),
                ('grid_col_end', models.PositiveIntegerField(help_text='Ending column in grid (1-indexed)')),
                ('z_index', models.IntegerField(default=0, help_text='Layer order for overlapping widgets')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('scene', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='kiosk.kioskscene')),
                ('widget', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='kiosk.kioskwidget')),
            ],
            options={
                'db_table': 'kiosk_widget_placements',
                'ordering': ['z_index', 'grid_row_start', 'grid_col_start'],
                'unique_together': {('scene', 'widget')},
            },
        ),
        migrations.AddIndex(
            model_name='kioskscene',
            index=models.Index(fields=['building', 'is_enabled'], name='kiosk_scene_building_enabled_idx'),
        ),
        migrations.AddIndex(
            model_name='kioskscene',
            index=models.Index(fields=['order'], name='kiosk_scene_order_idx'),
        ),
        migrations.AddIndex(
            model_name='widgetplacement',
            index=models.Index(fields=['scene'], name='kiosk_widge_scene_i_idx'),
        ),
    ]

