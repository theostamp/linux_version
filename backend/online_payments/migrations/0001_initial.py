import uuid

from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("buildings", "0001_initial"),
        ("apartments", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayeeSettings",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("mode", models.CharField(choices=[("two_iban", "Two IBAN"), ("one_iban", "One IBAN")], default="two_iban", max_length=20)),
                ("client_funds_iban", models.TextField(blank=True, null=True)),
                ("office_fees_iban", models.TextField(blank=True, null=True)),
                ("provider", models.CharField(choices=[("stripe", "Stripe")], default="stripe", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="Charge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("resident_user_id", models.PositiveIntegerField(blank=True, db_index=True, null=True)),
                ("category", models.CharField(choices=[("operational", "Λειτουργικά"), ("reserve", "Αποθεματικό"), ("fee", "Αμοιβή Διαχείρισης")], max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("currency", models.CharField(default="EUR", max_length=3)),
                ("period", models.CharField(db_index=True, help_text="YYYY-MM (π.χ. 2025-12)", max_length=7)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("unpaid", "Ανεξόφλητο"), ("pending", "Σε εξέλιξη"), ("paid", "Πληρωμένο"), ("failed", "Απέτυχε"), ("cancelled", "Ακυρώθηκε"), ("refunded", "Επιστράφηκε")], db_index=True, default="unpaid", max_length=20)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("created_by_user_id", models.PositiveIntegerField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("apartment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="online_charges", to="apartments.apartment")),
                ("building", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="online_charges", to="buildings.building")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["building", "apartment"], name="online_paym_buildin_22a1d8_idx"),
                    models.Index(fields=["building", "period"], name="online_paym_buildin_57aa3f_idx"),
                    models.Index(fields=["resident_user_id", "status"], name="online_paym_residen_7bd6d6_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="PaymentAttempt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(default="stripe", max_length=20)),
                ("provider_session_id", models.CharField(db_index=True, max_length=255, unique=True)),
                ("provider_payment_intent_id", models.CharField(blank=True, db_index=True, max_length=255, null=True)),
                ("status", models.CharField(choices=[("created", "Δημιουργήθηκε"), ("redirected", "Έγινε redirect"), ("succeeded", "Επιτυχία"), ("failed", "Αποτυχία"), ("cancelled", "Ακυρώθηκε")], db_index=True, default="created", max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("currency", models.CharField(default="EUR", max_length=3)),
                ("routed_to", models.CharField(choices=[("client_funds", "Client Funds"), ("office_fees", "Office Fees")], default="client_funds", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("building", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="online_payment_attempts", to="buildings.building")),
                ("charge", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payment_attempts", to="online_payments.charge")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["charge", "status"], name="online_paym_charge__3dc68f_idx"),
                    models.Index(fields=["building", "created_at"], name="online_paym_buildin_9a2f19_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("provider", models.CharField(default="stripe", max_length=20)),
                ("provider_payment_id", models.CharField(db_index=True, max_length=255, unique=True)),
                ("paid_at", models.DateTimeField(default=timezone.now)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("currency", models.CharField(default="EUR", max_length=3)),
                ("method", models.CharField(default="unknown", max_length=50)),
                ("routed_to", models.CharField(choices=[("client_funds", "Client Funds"), ("office_fees", "Office Fees")], default="client_funds", max_length=20)),
                ("raw_summary", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("charge", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payments", to="online_payments.charge")),
            ],
        ),
        migrations.CreateModel(
            name="ManualPayment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("method", models.CharField(choices=[("cash", "Μετρητά"), ("bank_deposit", "Κατάθεση"), ("other", "Άλλο")], max_length=20)),
                ("recorded_by_user_id", models.PositiveIntegerField()),
                ("recorded_at", models.DateTimeField(default=timezone.now)),
                ("note", models.TextField(blank=True, null=True)),
                ("attachment_url", models.TextField(blank=True, null=True)),
                ("charge", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="manual_payments", to="online_payments.charge")),
            ],
        ),
    ]


