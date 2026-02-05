import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("online_payments", "0001_initial"),
        ("financial", "0057_cash_funding"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OnlinePaymentLedgerLink",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(choices=[("stripe", "Stripe")], default="stripe", max_length=20)),
                ("provider_event_id", models.CharField(blank=True, db_index=True, max_length=255, null=True, unique=True)),
                ("provider_payment_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("source", models.CharField(choices=[("webhook", "Webhook"), ("manual", "Manual"), ("reconcile", "Reconcile")], default="webhook", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("charge", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ledger_links", to="online_payments.charge")),
                ("financial_payment", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="online_payment_link", to="financial.payment")),
                ("online_payment", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ledger_link", to="online_payments.payment")),
                ("payment_attempt", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ledger_links", to="online_payments.paymentattempt")),
            ],
            options={
                "verbose_name": "Online Payment Ledger Link",
                "verbose_name_plural": "Online Payment Ledger Links",
                "indexes": [
                    models.Index(fields=["charge", "created_at"], name="online_paym_charge__4b759b_idx"),
                    models.Index(fields=["provider_payment_id"], name="online_paym_provid_3f05b4_idx"),
                    models.Index(fields=["source"], name="online_paym_source_77f0d8_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="OnlinePaymentAuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("action", models.CharField(choices=[("manual_mark_paid", "Manual Mark Paid"), ("webhook_sync", "Webhook Sync"), ("sync_skipped", "Sync Skipped"), ("reconcile", "Reconcile")], max_length=30)),
                ("description", models.TextField()),
                ("provider_event_id", models.CharField(blank=True, max_length=255, null=True)),
                ("request_method", models.CharField(blank=True, max_length=10)),
                ("request_path", models.CharField(blank=True, max_length=255)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("charge", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="online_payments.charge")),
                ("financial_payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="financial.payment")),
                ("online_payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="online_payments.payment")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Online Payment Audit Log",
                "verbose_name_plural": "Online Payment Audit Logs",
                "ordering": ["-timestamp"],
                "indexes": [
                    models.Index(fields=["timestamp"], name="online_paym_timesta_8c9b83_idx"),
                    models.Index(fields=["action"], name="online_paym_action_5c132a_idx"),
                    models.Index(fields=["provider_event_id"], name="online_paym_provid_d50517_idx"),
                ],
            },
        ),
    ]
