import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class AdPlacementCode(models.TextChoices):
    TICKER = "ticker", _("News Ticker")
    BANNER = "banner", _("Banner")
    INTERSTITIAL = "interstitial", _("Whole Page / Interstitial")


class AdContractStatus(models.TextChoices):
    TRIAL_ACTIVE = "trial_active", _("Trial Active")
    TRIAL_EXPIRED = "trial_expired", _("Trial Expired")
    ACTIVE_PAID = "active_paid", _("Active (Paid)")
    PAUSED = "paused", _("Paused")
    CANCELLED = "cancelled", _("Cancelled")


class AdCreativeStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    PENDING = "pending", _("Pending Review")
    APPROVED = "approved", _("Approved")
    LIVE = "live", _("Live")
    REJECTED = "rejected", _("Rejected")


class AdBillingKind(models.TextChoices):
    SUBSCRIPTION = "subscription", _("Subscription")
    MANUAL = "manual", _("Manual")


class AdBillingStatus(models.TextChoices):
    CREATED = "created", _("Created")
    PAID = "paid", _("Paid")
    FAILED = "failed", _("Failed")


class AdLandingToken(models.Model):
    """
    Δημόσιο token που μπαίνει σε QR/επιστολές.
    Αποθηκεύεται στο PUBLIC schema και αντιστοιχεί σε (tenant_schema, building_id).
    """

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    tenant_schema = models.CharField(max_length=63, db_index=True)
    building_id = models.PositiveIntegerField(db_index=True)

    campaign_source = models.CharField(max_length=120, blank=True, default="")
    utm_source = models.CharField(max_length=120, blank=True, default="")
    utm_medium = models.CharField(max_length=120, blank=True, default="")
    utm_campaign = models.CharField(max_length=120, blank=True, default="")
    utm_content = models.CharField(max_length=120, blank=True, default="")
    utm_term = models.CharField(max_length=120, blank=True, default="")

    is_active = models.BooleanField(default=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Ad Landing Token")
        verbose_name_plural = _("Ad Landing Tokens")
        indexes = [
            models.Index(fields=["tenant_schema", "building_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_schema}:{self.building_id} ({self.token})"

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return timezone.now() >= self.expires_at


class AdPlacementType(models.Model):
    """
    Διαθέσιμα placements + pricing config.
    """

    code = models.CharField(max_length=32, choices=AdPlacementCode.choices, unique=True)
    display_name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")

    monthly_price_eur = models.DecimalField(max_digits=8, decimal_places=2)
    max_slots_per_building = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Ad Placement Type")
        verbose_name_plural = _("Ad Placement Types")
        ordering = ["monthly_price_eur", "code"]

    def __str__(self) -> str:
        return f"{self.code} (€{self.monthly_price_eur}/mo)"


class AdLead(models.Model):
    """
    Lead (τοπικός επαγγελματίας) που ξεκίνησε trial.
    """

    tenant_schema = models.CharField(max_length=63, db_index=True)
    building_id = models.PositiveIntegerField(db_index=True)

    email = models.EmailField(db_index=True)
    business_name = models.CharField(max_length=255)
    place_id = models.CharField(max_length=255, blank=True, default="")
    category = models.CharField(max_length=120, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")

    consent_terms = models.BooleanField(default=False)
    consent_marketing = models.BooleanField(default=False)

    source_token = models.ForeignKey(
        AdLandingToken,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Ad Lead")
        verbose_name_plural = _("Ad Leads")
        indexes = [
            models.Index(fields=["tenant_schema", "building_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.business_name} <{self.email}>"


class AdContract(models.Model):
    """
    “Συμβόλαιο” προβολής για ένα συγκεκριμένο building + placement.
    Διαχειρίζεται trial και paid periods.
    """

    manage_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    tenant_schema = models.CharField(max_length=63, db_index=True)
    building_id = models.PositiveIntegerField(db_index=True)

    lead = models.ForeignKey(AdLead, on_delete=models.CASCADE, related_name="contracts")
    placement_type = models.ForeignKey(AdPlacementType, on_delete=models.PROTECT, related_name="contracts")

    status = models.CharField(max_length=32, choices=AdContractStatus.choices, db_index=True)

    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True, db_index=True)

    active_until = models.DateTimeField(null=True, blank=True, db_index=True)

    # Stripe metadata (optional, filled on paid conversion)
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_status = models.CharField(max_length=50, blank=True, default="")

    last_payment_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Ad Contract")
        verbose_name_plural = _("Ad Contracts")
        indexes = [
            models.Index(fields=["tenant_schema", "building_id", "status"]),
            models.Index(fields=["tenant_schema", "building_id", "placement_type"]),
        ]

    def __str__(self) -> str:
        return f"Contract #{self.id} {self.tenant_schema}:{self.building_id} {self.placement_type.code}"

    @classmethod
    def default_trial_ends_at(cls):
        return timezone.now() + timedelta(days=30)

    def is_trial_active(self) -> bool:
        if self.status != AdContractStatus.TRIAL_ACTIVE:
            return False
        if not self.trial_ends_at:
            return True
        return timezone.now() < self.trial_ends_at

    def is_active_for_kiosk(self) -> bool:
        """
        Κριτήριο για προβολή στο kiosk.
        - Trial: ενεργό μέχρι trial_ends_at
        - Paid: ενεργό μέχρι active_until (ή άπειρα αν είναι None και status ACTIVE_PAID)
        """
        now = timezone.now()
        if self.status == AdContractStatus.TRIAL_ACTIVE:
            return self.is_trial_active()
        if self.status == AdContractStatus.ACTIVE_PAID:
            if self.active_until is None:
                return True
            return now < self.active_until
        return False


class AdCreative(models.Model):
    """
    Δημιουργικό περιεχόμενο για προβολή.
    MVP: κρατάμε text-first, με προαιρετικό image_url.
    """

    contract = models.ForeignKey(AdContract, on_delete=models.CASCADE, related_name="creatives")

    headline = models.CharField(max_length=120, blank=True, default="")
    body = models.CharField(max_length=240, blank=True, default="")
    ticker_text = models.CharField(max_length=160, blank=True, default="")

    image_url = models.URLField(max_length=1000, blank=True, default="")
    cta_url = models.URLField(max_length=1000, blank=True, default="")

    status = models.CharField(max_length=20, choices=AdCreativeStatus.choices, default=AdCreativeStatus.DRAFT, db_index=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Ad Creative")
        verbose_name_plural = _("Ad Creatives")

    def __str__(self) -> str:
        return f"Creative #{self.id} for Contract #{self.contract_id}"


class AdBillingRecord(models.Model):
    """
    Καταγραφή πληρωμής/περιόδου (manual ή subscription).
    """

    contract = models.ForeignKey(AdContract, on_delete=models.CASCADE, related_name="billing_records")

    kind = models.CharField(max_length=20, choices=AdBillingKind.choices, db_index=True)
    status = models.CharField(max_length=20, choices=AdBillingStatus.choices, db_index=True)

    amount_eur = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="EUR")

    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True, db_index=True)

    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    stripe_invoice_id = models.CharField(max_length=255, blank=True, default="", db_index=True)

    raw_summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Ad Billing Record")
        verbose_name_plural = _("Ad Billing Records")
        indexes = [
            models.Index(fields=["kind", "status"]),
        ]

    def __str__(self) -> str:
        return f"Billing #{self.id} {self.kind}/{self.status} for Contract #{self.contract_id}"


class AdEvent(models.Model):
    """
    Funnel analytics events (lightweight).
    """

    event_type = models.CharField(max_length=80, db_index=True)

    tenant_schema = models.CharField(max_length=63, blank=True, default="", db_index=True)
    building_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)

    landing_token = models.ForeignKey(
        AdLandingToken,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    contract = models.ForeignKey(
        AdContract,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("Ad Event")
        verbose_name_plural = _("Ad Events")
        indexes = [
            models.Index(fields=["tenant_schema", "building_id", "event_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} @ {self.created_at:%Y-%m-%d %H:%M}"


