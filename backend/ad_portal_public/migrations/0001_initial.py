from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="WebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(default="stripe", max_length=20)),
                ("event_id", models.CharField(db_index=True, max_length=255, unique=True)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("signature_valid", models.BooleanField(default=False)),
                ("payload_json", models.JSONField()),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "processing_status",
                    models.CharField(
                        choices=[("ok", "OK"), ("duplicate", "Duplicate"), ("failed", "Failed")],
                        default="ok",
                        max_length=20,
                    ),
                ),
                ("error_message", models.TextField(blank=True, null=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["provider", "received_at"], name="adportal_p_provide_recv_idx"),
                    models.Index(fields=["processing_status"], name="adportal_p_process_idx"),
                ],
            },
        )
    ]


