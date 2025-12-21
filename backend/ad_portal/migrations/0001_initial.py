import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AdLandingToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("tenant_schema", models.CharField(db_index=True, max_length=63)),
                ("building_id", models.PositiveIntegerField(db_index=True)),
                ("campaign_source", models.CharField(blank=True, default="", max_length=120)),
                ("utm_source", models.CharField(blank=True, default="", max_length=120)),
                ("utm_medium", models.CharField(blank=True, default="", max_length=120)),
                ("utm_campaign", models.CharField(blank=True, default="", max_length=120)),
                ("utm_content", models.CharField(blank=True, default="", max_length=120)),
                ("utm_term", models.CharField(blank=True, default="", max_length=120)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("expires_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant_schema", "building_id"], name="adportal_ltoken_tenant_building_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="AdPlacementType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "code",
                    models.CharField(
                        choices=[("ticker", "News Ticker"), ("banner", "Banner"), ("interstitial", "Whole Page / Interstitial")],
                        max_length=32,
                        unique=True,
                    ),
                ),
                ("display_name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                ("monthly_price_eur", models.DecimalField(decimal_places=2, max_digits=8)),
                ("max_slots_per_building", models.PositiveIntegerField(default=1)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["monthly_price_eur", "code"]},
        ),
        migrations.CreateModel(
            name="AdLead",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tenant_schema", models.CharField(db_index=True, max_length=63)),
                ("building_id", models.PositiveIntegerField(db_index=True)),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("business_name", models.CharField(max_length=255)),
                ("place_id", models.CharField(blank=True, default="", max_length=255)),
                ("category", models.CharField(blank=True, default="", max_length=120)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("consent_terms", models.BooleanField(default=False)),
                ("consent_marketing", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "source_token",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="leads",
                        to="ad_portal.adlandingtoken",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant_schema", "building_id"], name="adportal_lead_tenant_building_idx"),
                ]
            },
        ),
        migrations.CreateModel(
            name="AdContract",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("manage_token", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("tenant_schema", models.CharField(db_index=True, max_length=63)),
                ("building_id", models.PositiveIntegerField(db_index=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("trial_active", "Trial Active"),
                            ("trial_expired", "Trial Expired"),
                            ("active_paid", "Active (Paid)"),
                            ("paused", "Paused"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("trial_started_at", models.DateTimeField(blank=True, null=True)),
                ("trial_ends_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("active_until", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("stripe_customer_id", models.CharField(blank=True, default="", max_length=255)),
                ("stripe_subscription_id", models.CharField(blank=True, default="", max_length=255)),
                ("stripe_subscription_status", models.CharField(blank=True, default="", max_length=50)),
                ("last_payment_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "lead",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contracts", to="ad_portal.adlead"),
                ),
                (
                    "placement_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT, related_name="contracts", to="ad_portal.adplacementtype"
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant_schema", "building_id", "status"], name="adportal_ct_tenant_build_status_idx"),
                    models.Index(fields=["tenant_schema", "building_id", "placement_type"], name="adportal_ct_tenant_build_place_idx"),
                ]
            },
        ),
        migrations.CreateModel(
            name="AdCreative",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("headline", models.CharField(blank=True, default="", max_length=120)),
                ("body", models.CharField(blank=True, default="", max_length=240)),
                ("ticker_text", models.CharField(blank=True, default="", max_length=160)),
                ("image_url", models.URLField(blank=True, default="", max_length=1000)),
                ("cta_url", models.URLField(blank=True, default="", max_length=1000)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("pending", "Pending Review"),
                            ("approved", "Approved"),
                            ("live", "Live"),
                            ("rejected", "Rejected"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "contract",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="creatives", to="ad_portal.adcontract"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="AdBillingRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("subscription", "Subscription"), ("manual", "Manual")], db_index=True, max_length=20)),
                ("status", models.CharField(choices=[("created", "Created"), ("paid", "Paid"), ("failed", "Failed")], db_index=True, max_length=20)),
                ("amount_eur", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("currency", models.CharField(default="EUR", max_length=10)),
                ("period_start", models.DateTimeField(blank=True, null=True)),
                ("period_end", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("stripe_checkout_session_id", models.CharField(blank=True, db_index=True, default="", max_length=255)),
                ("stripe_payment_intent_id", models.CharField(blank=True, db_index=True, default="", max_length=255)),
                ("stripe_invoice_id", models.CharField(blank=True, db_index=True, default="", max_length=255)),
                ("raw_summary", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "contract",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="billing_records", to="ad_portal.adcontract"
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["kind", "status"], name="adportal_bill_kind_status_idx"),
                ]
            },
        ),
        migrations.CreateModel(
            name="AdEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(db_index=True, max_length=80)),
                ("tenant_schema", models.CharField(blank=True, db_index=True, default="", max_length=63)),
                ("building_id", models.PositiveIntegerField(blank=True, db_index=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "landing_token",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="events",
                        to="ad_portal.adlandingtoken",
                    ),
                ),
                (
                    "contract",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="events",
                        to="ad_portal.adcontract",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["tenant_schema", "building_id", "event_type"], name="adportal_evt_tenant_build_type_idx"),
                ]
            },
        ),
    ]


