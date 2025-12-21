from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ad_portal", "0002_seed_default_placement_types"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdDailySnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(db_index=True)),
                ("tenant_schema", models.CharField(blank=True, db_index=True, default="", max_length=63)),
                ("building_id", models.PositiveIntegerField(blank=True, db_index=True, null=True)),
                ("placement_code", models.CharField(blank=True, db_index=True, default="", max_length=32)),
                ("landing_views", models.PositiveIntegerField(default=0)),
                ("trials_started", models.PositiveIntegerField(default=0)),
                ("manage_views", models.PositiveIntegerField(default=0)),
                ("creatives_updated", models.PositiveIntegerField(default=0)),
                ("checkouts_started", models.PositiveIntegerField(default=0)),
                ("payment_success", models.PositiveIntegerField(default=0)),
                ("payment_failed", models.PositiveIntegerField(default=0)),
                ("leads_created", models.PositiveIntegerField(default=0)),
                ("trials_ending", models.PositiveIntegerField(default=0)),
                ("computed_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Ad Daily Snapshot",
                "verbose_name_plural": "Ad Daily Snapshots",
            },
        ),
        migrations.AddIndex(
            model_name="addailysnapshot",
            index=models.Index(fields=["date", "tenant_schema", "building_id"], name="adportal_snap_date_tenant_building_idx"),
        ),
        migrations.AddConstraint(
            model_name="addailysnapshot",
            constraint=models.UniqueConstraint(
                fields=("date", "tenant_schema", "building_id", "placement_code"),
                name="adportal_daily_snapshot_unique",
            ),
        ),
    ]


