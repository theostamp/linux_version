# Generated manually for Office Ops bulk engine.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("buildings", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BulkTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                (
                    "operation_type",
                    models.CharField(
                        choices=[
                            ("issue_monthly_charges", "Issue Monthly Charges"),
                            ("create_management_fee_incomes", "Create Management Fee Incomes"),
                            ("export_debt_report", "Export Debt Report"),
                        ],
                        max_length=50,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("is_system", models.BooleanField(default=False)),
                ("default_month_offset", models.SmallIntegerField(default=0)),
                ("config", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_bulk_templates",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["operation_type", "name"],
            },
        ),
        migrations.CreateModel(
            name="BulkJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "operation_type",
                    models.CharField(
                        choices=[
                            ("issue_monthly_charges", "Issue Monthly Charges"),
                            ("create_management_fee_incomes", "Create Management Fee Incomes"),
                            ("export_debt_report", "Export Debt Report"),
                        ],
                        max_length=50,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("previewed", "Previewed"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("partial", "Partial"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("month", models.CharField(blank=True, default="", max_length=7)),
                ("dry_run_completed", models.BooleanField(default=False)),
                ("options", models.JSONField(blank=True, default=dict)),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("idempotency_key", models.CharField(db_index=True, max_length=120, unique=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "building",
                    models.ForeignKey(
                        blank=True,
                        help_text="Optional building scope. If null, applies to all tenant buildings.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="office_bulk_jobs",
                        to="buildings.building",
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="requested_bulk_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "source_template",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="jobs",
                        to="office_ops.bulktemplate",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BulkJobItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("entity_type", models.CharField(default="building", max_length=40)),
                ("entity_id", models.CharField(max_length=64)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("validated", "Validated"),
                            ("executed", "Executed"),
                            ("failed", "Failed"),
                            ("skipped", "Skipped"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("currency", models.CharField(default="EUR", max_length=10)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("validation_errors", models.JSONField(blank=True, default=list)),
                ("result", models.JSONField(blank=True, default=dict)),
                ("retry_count", models.PositiveSmallIntegerField(default=0)),
                ("executed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "building",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="office_bulk_job_items",
                        to="buildings.building",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="office_ops.bulkjob",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at", "entity_type", "entity_id"],
            },
        ),
        migrations.CreateModel(
            name="BulkJobError",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("error_code", models.CharField(blank=True, default="", max_length=80)),
                ("message", models.TextField()),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="errors",
                        to="office_ops.bulkjobitem",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="errors",
                        to="office_ops.bulkjob",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="bulktemplate",
            constraint=models.UniqueConstraint(
                fields=("operation_type", "name"),
                name="office_ops_template_unique_name_per_operation",
            ),
        ),
        migrations.AddConstraint(
            model_name="bulkjobitem",
            constraint=models.UniqueConstraint(
                fields=("job", "entity_type", "entity_id"),
                name="office_ops_item_unique_per_job_entity",
            ),
        ),
    ]
