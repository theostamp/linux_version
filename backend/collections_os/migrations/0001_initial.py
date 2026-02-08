# Generated manually for Collections OS initial schema.

import decimal
import django.core.validators
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("apartments", "0001_initial"),
        ("buildings", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="DunningPolicy",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("min_days_overdue", models.PositiveIntegerField(default=0)),
                ("max_days_overdue", models.PositiveIntegerField(blank=True, null=True)),
                (
                    "channel",
                    models.CharField(
                        choices=[("email", "Email"), ("sms", "SMS"), ("push", "Push"), ("viber", "Viber")],
                        default="email",
                        max_length=20,
                    ),
                ),
                ("frequency_days", models.PositiveIntegerField(default=7)),
                ("escalation_level", models.PositiveSmallIntegerField(default=1)),
                ("max_attempts", models.PositiveSmallIntegerField(default=3)),
                ("template_slug", models.CharField(blank=True, default="", max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dunning_policies",
                        to="buildings.building",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_dunning_policies",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["building_id", "min_days_overdue", "escalation_level", "id"],
            },
        ),
        migrations.CreateModel(
            name="DunningRun",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "source",
                    models.CharField(
                        choices=[("manual", "Manual"), ("scheduled", "Scheduled"), ("retry", "Retry")],
                        default="manual",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("month", models.CharField(blank=True, default="", max_length=7)),
                ("idempotency_key", models.CharField(db_index=True, max_length=80, unique=True)),
                ("total_candidates", models.PositiveIntegerField(default=0)),
                ("total_sent", models.PositiveIntegerField(default=0)),
                ("total_failed", models.PositiveIntegerField(default=0)),
                ("total_skipped", models.PositiveIntegerField(default=0)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dunning_runs",
                        to="buildings.building",
                    ),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="runs",
                        to="collections_os.dunningpolicy",
                    ),
                ),
                (
                    "triggered_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="triggered_dunning_runs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-started_at"],
            },
        ),
        migrations.CreateModel(
            name="DunningEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "channel",
                    models.CharField(
                        choices=[("email", "Email"), ("sms", "SMS"), ("push", "Push"), ("viber", "Viber")],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("queued", "Queued"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")],
                        default="queued",
                        max_length=20,
                    ),
                ),
                ("recipient", models.CharField(blank=True, default="", max_length=255)),
                ("days_overdue", models.PositiveIntegerField(default=0)),
                (
                    "amount_due",
                    models.DecimalField(decimal_places=2, default=decimal.Decimal("0.00"), max_digits=10),
                ),
                ("attempt_number", models.PositiveSmallIntegerField(default=1)),
                ("provider_message_id", models.CharField(blank=True, default="", max_length=255)),
                ("error_code", models.CharField(blank=True, default="", max_length=50)),
                ("error_message", models.TextField(blank=True, default="")),
                ("trace_id", models.UUIDField(db_index=True, default=uuid.uuid4)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "apartment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dunning_events",
                        to="apartments.apartment",
                    ),
                ),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dunning_events",
                        to="buildings.building",
                    ),
                ),
                (
                    "policy",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="collections_os.dunningpolicy",
                    ),
                ),
                (
                    "run",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="collections_os.dunningrun",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PromiseToPay",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10, validators=[django.core.validators.MinValueValidator(decimal.Decimal("0.01"))])),
                ("promised_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Active"), ("kept", "Kept"), ("broken", "Broken"), ("cancelled", "Cancelled")],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("kept_at", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "apartment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promises_to_pay",
                        to="apartments.apartment",
                    ),
                ),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promises_to_pay",
                        to="buildings.building",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_promises_to_pay",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "resident_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="promises_to_pay",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "source_event",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="promises_to_pay",
                        to="collections_os.dunningevent",
                    ),
                ),
            ],
            options={
                "ordering": ["promised_date", "-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="dunningpolicy",
            constraint=models.UniqueConstraint(
                fields=("building", "name"),
                name="collections_policy_unique_name_per_building",
            ),
        ),
        migrations.AddConstraint(
            model_name="dunningpolicy",
            constraint=models.CheckConstraint(
                condition=models.Q(max_days_overdue__isnull=True) | models.Q(
                    max_days_overdue__gte=models.F("min_days_overdue")
                ),
                name="collections_policy_max_days_gte_min_days",
            ),
        ),
        migrations.AddConstraint(
            model_name="dunningevent",
            constraint=models.UniqueConstraint(
                fields=("run", "apartment", "channel"),
                name="collections_event_unique_per_run_apartment_channel",
            ),
        ),
        migrations.AddIndex(
            model_name="dunningpolicy",
            index=models.Index(fields=["building", "is_active"], name="collectionso_buildin_4f0138_idx"),
        ),
        migrations.AddIndex(
            model_name="dunningpolicy",
            index=models.Index(fields=["building", "channel"], name="collectionso_buildin_d64f4a_idx"),
        ),
        migrations.AddIndex(
            model_name="dunningrun",
            index=models.Index(fields=["building", "status", "started_at"], name="collectionso_buildin_2d24de_idx"),
        ),
        migrations.AddIndex(
            model_name="dunningrun",
            index=models.Index(fields=["policy", "month"], name="collectionso_policy__5b7f7e_idx"),
        ),
        migrations.AddIndex(
            model_name="dunningevent",
            index=models.Index(fields=["building", "status", "channel"], name="collectionso_buildin_5a34d4_idx"),
        ),
        migrations.AddIndex(
            model_name="dunningevent",
            index=models.Index(fields=["apartment", "created_at"], name="collectionso_apartme_996051_idx"),
        ),
        migrations.AddIndex(
            model_name="promisetopay",
            index=models.Index(fields=["building", "status", "promised_date"], name="collectionso_buildin_4e11e6_idx"),
        ),
        migrations.AddIndex(
            model_name="promisetopay",
            index=models.Index(fields=["apartment", "status"], name="collectionso_apartme_a823bc_idx"),
        ),
    ]
