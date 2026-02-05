import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apartments.models import Apartment
from buildings.models import Building


class ChargeCategory(models.TextChoices):
    OPERATIONAL = "operational", "Λειτουργικά"
    RESERVE = "reserve", "Αποθεματικό"
    FEE = "fee", "Αμοιβή Διαχείρισης"


class ChargeStatus(models.TextChoices):
    UNPAID = "unpaid", "Ανεξόφλητο"
    PENDING = "pending", "Σε εξέλιξη"
    PAID = "paid", "Πληρωμένο"
    FAILED = "failed", "Απέτυχε"
    CANCELLED = "cancelled", "Ακυρώθηκε"
    REFUNDED = "refunded", "Επιστράφηκε"


class PaymentAttemptStatus(models.TextChoices):
    CREATED = "created", "Δημιουργήθηκε"
    REDIRECTED = "redirected", "Έγινε redirect"
    SUCCEEDED = "succeeded", "Επιτυχία"
    FAILED = "failed", "Αποτυχία"
    CANCELLED = "cancelled", "Ακυρώθηκε"


class RouteDestination(models.TextChoices):
    CLIENT_FUNDS = "client_funds", "Client Funds"
    OFFICE_FEES = "office_fees", "Office Fees"


class PayeeMode(models.TextChoices):
    TWO_IBAN = "two_iban", "Two IBAN"
    ONE_IBAN = "one_iban", "One IBAN"


class PayeeProvider(models.TextChoices):
    STRIPE = "stripe", "Stripe"


class PayeeSettings(models.Model):
    """
    Tenant-level ρυθμίσεις για δρομολόγηση/λογιστική κατηγοριοποίηση (Two-IBAN mode).
    Στο MVP δεν κάνουμε πραγματικό split payout (Stripe Connect), μόνο classification.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mode = models.CharField(max_length=20, choices=PayeeMode.choices, default=PayeeMode.TWO_IBAN)

    # Note: encryption at rest will be implemented via an encrypted field helper (see services/encryption.py).
    client_funds_iban = models.TextField(null=True, blank=True)
    office_fees_iban = models.TextField(null=True, blank=True)

    provider = models.CharField(max_length=20, choices=PayeeProvider.choices, default=PayeeProvider.STRIPE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payee Settings"
        verbose_name_plural = "Payee Settings"


class Charge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="online_charges")
    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name="online_charges")

    # Public-schema user ID (CustomUser.id). Stored as int to avoid cross-schema FK.
    resident_user_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)

    category = models.CharField(max_length=20, choices=ChargeCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="EUR")
    period = models.CharField(max_length=7, db_index=True, help_text="YYYY-MM (π.χ. 2025-12)")
    description = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=ChargeStatus.choices, default=ChargeStatus.UNPAID, db_index=True)
    due_date = models.DateField(null=True, blank=True)

    # Public-schema user ID (CustomUser.id)
    created_by_user_id = models.PositiveIntegerField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Charge"
        verbose_name_plural = "Charges"
        indexes = [
            models.Index(fields=["building", "apartment"]),
            models.Index(fields=["building", "period"]),
            models.Index(fields=["resident_user_id", "status"]),
        ]

    def compute_routed_to(self) -> str:
        """
        Two-IBAN routing logic:
        - operational + reserve => client_funds
        - fee => office_fees
        """
        if self.category == ChargeCategory.FEE:
            return RouteDestination.OFFICE_FEES
        return RouteDestination.CLIENT_FUNDS


class PaymentAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="payment_attempts")
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="online_payment_attempts")

    provider = models.CharField(max_length=20, default=PayeeProvider.STRIPE)
    provider_session_id = models.CharField(max_length=255, unique=True, db_index=True)
    provider_payment_intent_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    status = models.CharField(max_length=20, choices=PaymentAttemptStatus.choices, default=PaymentAttemptStatus.CREATED, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="EUR")
    routed_to = models.CharField(max_length=20, choices=RouteDestination.choices, default=RouteDestination.CLIENT_FUNDS)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Attempt"
        verbose_name_plural = "Payment Attempts"
        indexes = [
            models.Index(fields=["charge", "status"]),
            models.Index(fields=["building", "created_at"]),
        ]


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="payments")
    provider = models.CharField(max_length=20, default=PayeeProvider.STRIPE)
    provider_payment_id = models.CharField(max_length=255, unique=True, db_index=True)
    paid_at = models.DateTimeField(default=timezone.now)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=3, default="EUR")
    method = models.CharField(max_length=50, default="unknown")
    routed_to = models.CharField(max_length=20, choices=RouteDestination.choices, default=RouteDestination.CLIENT_FUNDS)
    raw_summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"


class ManualPaymentMethod(models.TextChoices):
    CASH = "cash", "Μετρητά"
    BANK_DEPOSIT = "bank_deposit", "Κατάθεση"
    OTHER = "other", "Άλλο"


class ManualPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="manual_payments")
    method = models.CharField(max_length=20, choices=ManualPaymentMethod.choices)

    recorded_by_user_id = models.PositiveIntegerField()
    recorded_at = models.DateTimeField(default=timezone.now)
    note = models.TextField(null=True, blank=True)
    attachment_url = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Manual Payment"
        verbose_name_plural = "Manual Payments"


class LedgerSyncSource(models.TextChoices):
    WEBHOOK = "webhook", "Webhook"
    MANUAL = "manual", "Manual"
    RECONCILE = "reconcile", "Reconcile"


class OnlinePaymentLedgerLink(models.Model):
    """
    Mapping between online payments (Stripe) and financial ledger payments.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    charge = models.ForeignKey(Charge, on_delete=models.CASCADE, related_name="ledger_links")
    payment_attempt = models.ForeignKey(
        PaymentAttempt, on_delete=models.SET_NULL, related_name="ledger_links", null=True, blank=True
    )
    online_payment = models.OneToOneField(
        "online_payments.Payment", on_delete=models.SET_NULL, related_name="ledger_link", null=True, blank=True
    )
    financial_payment = models.OneToOneField(
        "financial.Payment", on_delete=models.CASCADE, related_name="online_payment_link"
    )

    provider = models.CharField(max_length=20, choices=PayeeProvider.choices, default=PayeeProvider.STRIPE)
    provider_event_id = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    provider_payment_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    source = models.CharField(max_length=20, choices=LedgerSyncSource.choices, default=LedgerSyncSource.WEBHOOK)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Online Payment Ledger Link"
        verbose_name_plural = "Online Payment Ledger Links"
        indexes = [
            models.Index(fields=["charge", "created_at"]),
            models.Index(fields=["provider_payment_id"]),
            models.Index(fields=["source"]),
        ]


class OnlinePaymentAuditAction(models.TextChoices):
    MANUAL_MARK_PAID = "manual_mark_paid", "Manual Mark Paid"
    WEBHOOK_SYNC = "webhook_sync", "Webhook Sync"
    SYNC_SKIPPED = "sync_skipped", "Sync Skipped"
    RECONCILE = "reconcile", "Reconcile"


class OnlinePaymentAuditLog(models.Model):
    """
    Audit log for online payment operations (manual mark-paid, webhook sync, reconciliation).
    """

    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    action = models.CharField(max_length=30, choices=OnlinePaymentAuditAction.choices)
    description = models.TextField()

    charge = models.ForeignKey(Charge, on_delete=models.SET_NULL, null=True, blank=True)
    online_payment = models.ForeignKey("online_payments.Payment", on_delete=models.SET_NULL, null=True, blank=True)
    financial_payment = models.ForeignKey("financial.Payment", on_delete=models.SET_NULL, null=True, blank=True)

    provider_event_id = models.CharField(max_length=255, null=True, blank=True)

    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Online Payment Audit Log"
        verbose_name_plural = "Online Payment Audit Logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["timestamp"]),
            models.Index(fields=["action"]),
            models.Index(fields=["provider_event_id"]),
        ]

    def __str__(self):
        return f"{self.timestamp} - {self.action} - {self.description}"

    @classmethod
    def log_action(
        cls,
        *,
        action: str,
        description: str,
        user=None,
        charge=None,
        online_payment=None,
        financial_payment=None,
        provider_event_id=None,
        request=None,
        metadata=None,
    ):
        try:
            return cls.objects.create(
                user=user if getattr(user, "is_authenticated", False) else None,
                action=action,
                description=description,
                charge=charge,
                online_payment=online_payment,
                financial_payment=financial_payment,
                provider_event_id=provider_event_id,
                request_method=getattr(request, "method", ""),
                request_path=getattr(request, "path", ""),
                ip_address=getattr(request, "META", {}).get("REMOTE_ADDR"),
                user_agent=getattr(request, "META", {}).get("HTTP_USER_AGENT", ""),
                metadata=metadata or {},
            )
        except Exception as exc:
            logger = logging.getLogger(__name__)
            logger.warning("[ONLINE_PAYMENTS][AUDIT] Failed to log audit action: %s", exc)
            return None

