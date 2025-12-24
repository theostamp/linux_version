import uuid
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class MarketplaceServiceType(models.TextChoices):
    REPAIR = "repair", "Επισκευές"
    CLEANING = "cleaning", "Καθαριότητα"
    SECURITY = "security", "Ασφάλεια"
    ELECTRICAL = "electrical", "Ηλεκτρολογικά"
    PLUMBING = "plumbing", "Υδραυλικά"
    HEATING = "heating", "Θέρμανση/Κλιματισμός"
    ELEVATOR = "elevator", "Ανελκυστήρες"
    LANDSCAPING = "landscaping", "Κηπουρική"
    PAINTING = "painting", "Βαψίματα"
    CARPENTRY = "carpentry", "Ξυλουργική"
    MASONRY = "masonry", "Κατασκευές"
    TECHNICAL = "technical", "Τεχνικές Υπηρεσίες"
    MAINTENANCE = "maintenance", "Συντήρηση"
    EMERGENCY = "emergency", "Επείγοντα"
    OTHER = "other", "Άλλο"


class MarketplaceProvider(models.Model):
    """
    Κεντρικός κατάλογος επαγγελματιών/συνεργείων (PUBLIC schema).

    Σκοπός:
    - Να είναι κοινός για όλους τους tenants.
    - Να υποστηρίζει geolocation (lat/lng) για ordering με βάση το κτίριο.
    - Να είναι "Connect-ready" για μελλοντικό Stripe Connect / προμήθειες.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core identity
    name = models.CharField(max_length=255, verbose_name="Όνομα")
    service_type = models.CharField(
        max_length=30,
        choices=MarketplaceServiceType.choices,
        db_index=True,
        verbose_name="Κατηγορία",
    )

    # Visibility / quality flags
    is_active = models.BooleanField(default=True, verbose_name="Ενεργός")
    show_in_marketplace = models.BooleanField(default=True, verbose_name="Εμφάνιση στο Marketplace")
    is_verified = models.BooleanField(default=False, verbose_name="Επαληθευμένος")
    is_featured = models.BooleanField(default=False, verbose_name="Προβεβλημένος")

    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("5.00"))],
        default=Decimal("0.00"),
        verbose_name="Αξιολόγηση",
    )

    # Contact / marketing profile
    phone = models.CharField(max_length=30, blank=True, default="", verbose_name="Τηλέφωνο")
    email = models.EmailField(blank=True, default="", verbose_name="Email")
    website = models.URLField(blank=True, default="", verbose_name="Ιστοσελίδα")
    address = models.TextField(blank=True, default="", verbose_name="Διεύθυνση")

    short_description = models.CharField(max_length=255, blank=True, default="", verbose_name="Σύντομη Περιγραφή")
    detailed_description = models.TextField(blank=True, default="", verbose_name="Αναλυτική Περιγραφή")
    special_offers = models.TextField(blank=True, default="", verbose_name="Ειδικές Προσφορές")

    coupon_code = models.CharField(max_length=50, blank=True, default="", verbose_name="Κωδικός Έκπτωσης")
    coupon_description = models.CharField(max_length=255, blank=True, default="", verbose_name="Περιγραφή Κουπονιού")

    portfolio_links = models.JSONField(default=list, blank=True, verbose_name="Portfolio Links")

    # Geolocation
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name="Γεωγραφικό Πλάτος",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name="Γεωγραφικό Μήκος",
    )
    service_radius_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Ακτίνα Εξυπηρέτησης (km)",
        help_text="Προαιρετική ακτίνα εξυπηρέτησης. Αν είναι κενό, δεν φιλτράρει απόσταση.",
    )
    is_nationwide = models.BooleanField(
        default=False,
        verbose_name="Εξυπηρέτηση Πανελλαδικά",
        help_text="Αν είναι ενεργό, αγνοεί φίλτρα μέγιστης απόστασης.",
    )

    # Connect-ready commission defaults
    default_commission_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        verbose_name="Override Προμήθεια (%)",
        help_text="Αν οριστεί, υπερισχύει του base rate της κατηγορίας (commission policy).",
    )
    featured_bonus_commission_rate_percent_override = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        verbose_name="Override Featured Bonus (%)",
        help_text="Αν ο provider είναι featured, αυτό το bonus υπερισχύει του featured bonus της κατηγορίας.",
    )
    stripe_account_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Stripe Connect Account ID",
        help_text="Για μελλοντικό Stripe Connect (προαιρετικό στο v1).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Marketplace Provider"
        verbose_name_plural = "Marketplace Providers"
        ordering = ["-is_featured", "-is_verified", "-rating", "name"]
        indexes = [
            models.Index(fields=["service_type"]),
            models.Index(fields=["show_in_marketplace", "is_active"]),
            models.Index(fields=["is_featured"]),
            models.Index(fields=["rating"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_service_type_display()})"


class MarketplaceCommissionPolicy(models.Model):
    """
    Commission policy ανά κατηγορία (PUBLIC schema).

    - base_commission_rate_percent: βασικό ποσοστό προμήθειας για την κατηγορία
    - featured_bonus_commission_rate_percent: επιπλέον % όταν ο provider είναι featured
    """

    service_type = models.CharField(
        max_length=30,
        choices=MarketplaceServiceType.choices,
        unique=True,
        db_index=True,
        verbose_name="Κατηγορία",
    )

    base_commission_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        default=Decimal("0.00"),
        verbose_name="Base Προμήθεια (%)",
    )
    featured_bonus_commission_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        default=Decimal("0.00"),
        verbose_name="Featured Bonus (%)",
    )

    is_active = models.BooleanField(default=True, verbose_name="Ενεργό")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Marketplace Commission Policy"
        verbose_name_plural = "Marketplace Commission Policies"
        ordering = ["service_type"]

    def __str__(self) -> str:
        return f"{self.get_service_type_display()}: {self.base_commission_rate_percent}% (+{self.featured_bonus_commission_rate_percent}% featured)"


class MarketplaceCommissionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    INVOICED = "invoiced", "Invoiced"
    PAID = "paid", "Paid"
    VOID = "void", "Void"


class MarketplaceCommission(models.Model):
    """
    Connect-ready commission record (PUBLIC schema).

    Δημιουργείται όταν μια προσφορά που προήλθε από Marketplace Provider εγκριθεί,
    ώστε η πλατφόρμα να μπορεί να τιμολογήσει/εισπράξει προμήθεια (offline στο v1).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    tenant_schema = models.CharField(max_length=64, db_index=True, verbose_name="Tenant Schema")
    building_id = models.IntegerField(null=True, blank=True, db_index=True, verbose_name="Building ID (tenant)")
    project_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="Project ID (tenant)")
    offer_id = models.UUIDField(null=True, blank=True, db_index=True, verbose_name="Offer ID (tenant)")

    provider_id = models.UUIDField(db_index=True, verbose_name="Provider ID (public)")
    provider_name_snapshot = models.CharField(max_length=255, blank=True, default="", verbose_name="Provider Name (snapshot)")

    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Μικτό Ποσό")
    commission_rate_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        verbose_name="Προμήθεια (%)",
    )
    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Ποσό Προμήθειας",
    )

    status = models.CharField(
        max_length=20,
        choices=MarketplaceCommissionStatus.choices,
        default=MarketplaceCommissionStatus.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Marketplace Commission"
        verbose_name_plural = "Marketplace Commissions"
        ordering = ["-created_at"]
        unique_together = [("tenant_schema", "offer_id")]
        indexes = [
            models.Index(fields=["tenant_schema", "building_id"]),
            models.Index(fields=["tenant_schema", "project_id"]),
        ]

    def __str__(self) -> str:
        return f"Commission {self.id} ({self.status})"


