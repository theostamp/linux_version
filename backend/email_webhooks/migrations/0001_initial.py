from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="EmailWebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(db_index=True, default="mailersend", max_length=50)),
                ("event_id", models.CharField(blank=True, db_index=True, max_length=200)),
                ("message_id", models.CharField(blank=True, db_index=True, max_length=200)),
                ("email", models.EmailField(blank=True, db_index=True, max_length=254)),
                ("event_type", models.CharField(blank=True, db_index=True, max_length=50)),
                ("occurred_at", models.DateTimeField(blank=True, null=True)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("signature", models.CharField(blank=True, max_length=255)),
            ],
            options={
                "ordering": ["-received_at"],
            },
        ),
        migrations.AddIndex(
            model_name="emailwebhookevent",
            index=models.Index(fields=["provider", "event_type"], name="email_webh_provider_6c8c70_idx"),
        ),
        migrations.AddIndex(
            model_name="emailwebhookevent",
            index=models.Index(fields=["provider", "message_id"], name="email_webh_provider_b37910_idx"),
        ),
    ]
