from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("kiosk", "0004_rename_kiosk_scene_building_enabled_idx_kiosk_scene_buildin_000d6a_idx_and_more"),
        ("buildings", "0001_initial"),
        ("apartments", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="KioskAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("action", models.CharField(choices=[("token_issued", "Token Issued"), ("register_attempt", "Register Attempt"), ("register_success", "Register Success"), ("register_failed", "Register Failed")], max_length=30)),
                ("status", models.CharField(blank=True, max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("apartment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="apartments.apartment")),
                ("building", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="buildings.building")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Kiosk Audit Log",
                "verbose_name_plural": "Kiosk Audit Logs",
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(fields=["timestamp"], name="kiosk_audi_timesta_9dfd16_idx"),
                    models.Index(fields=["action"], name="kiosk_audi_action_1bb004_idx"),
                    models.Index(fields=["status"], name="kiosk_audi_status_98a57e_idx"),
                ],
            },
        ),
    ]
