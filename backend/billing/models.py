# billing/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid

User = get_user_model()

PREMIUM_MIN_MONTHLY = Decimal('30.00')
PREMIUM_IOT_MIN_MONTHLY = Decimal('35.00')
MINIMUM_MONTHLY_BY_PLAN = {
    'premium': PREMIUM_MIN_MONTHLY,
    'premium_iot': PREMIUM_IOT_MIN_MONTHLY,
}


def apply_monthly_minimum(plan_category: str, monthly_price: Decimal, apartment_count: int) -> Decimal:
    minimum = MINIMUM_MONTHLY_BY_PLAN.get(plan_category)
    if not minimum or apartment_count <= 0:
        return monthly_price
    return max(monthly_price, minimum)


class PricingTier(models.Model):
    """
    Κλιμακωτή τιμολόγηση βάσει αριθμού διαμερισμάτων.

    Παράδειγμα:
    - Web: €1.0/διαμέρισμα
    - Premium: €1.8/διαμέρισμα
    - Premium + IoT: €2.3/διαμέρισμα
    """
    PLAN_CATEGORY_CHOICES = [
        ('free', 'Free'),
        ('web', 'Web'),
        ('premium', 'Premium'),
        ('premium_iot', 'Premium + IoT'),
        # Legacy categories (backward compatibility)
        ('cloud', 'Cloud (Legacy)'),
        ('kiosk', 'Info Point (Legacy)'),
    ]

    plan_category = models.CharField(
        max_length=20,
        choices=PLAN_CATEGORY_CHOICES,
        verbose_name='Κατηγορία Πακέτου'
    )

    min_apartments = models.PositiveIntegerField(
        verbose_name='Ελάχιστα Διαμερίσματα',
        help_text='Κάτω όριο διαμερισμάτων για αυτό το tier'
    )

    max_apartments = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Μέγιστα Διαμερίσματα',
        help_text='Άνω όριο (null = απεριόριστα)'
    )

    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Μηνιαία Τιμή (€)'
    )

    yearly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Ετήσια Τιμή (€)',
        help_text='Αν είναι null, υπολογίζεται αυτόματα με έκπτωση'
    )

    yearly_discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('16.67'),
        verbose_name='Ετήσια Έκπτωση (%)',
        help_text='Έκπτωση για ετήσια πληρωμή (default: 2 μήνες δωρεάν = 16.67%)'
    )

    # Stripe Price IDs για κάθε tier
    stripe_price_id_monthly = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Stripe Price ID (Monthly)'
    )

    stripe_price_id_yearly = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Stripe Price ID (Yearly)'
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='Ενεργό'
    )

    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name='Σειρά Εμφάνισης'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Κλίμακα Τιμολόγησης'
        verbose_name_plural = 'Κλίμακες Τιμολόγησης'
        ordering = ['plan_category', 'min_apartments']
        unique_together = ['plan_category', 'min_apartments']

    def __str__(self):
        max_str = str(self.max_apartments) if self.max_apartments else '∞'
        return f"{self.get_plan_category_display()} | {self.min_apartments}-{max_str} διαμ. | €{self.monthly_price}/μήνα"

    @property
    def calculated_yearly_price(self):
        """Υπολογισμός ετήσιας τιμής με έκπτωση"""
        if self.yearly_price:
            return self.yearly_price
        yearly_full = self.monthly_price * 12
        discount = yearly_full * (self.yearly_discount_percent / 100)
        return yearly_full - discount

    @property
    def tier_label(self):
        """Human-readable label για το tier"""
        if self.max_apartments:
            return f"{self.min_apartments}-{self.max_apartments} διαμερίσματα"
        return f"{self.min_apartments}+ διαμερίσματα"

    @classmethod
    def get_tier_for_apartments(cls, plan_category: str, apartment_count: int):
        """
        Βρίσκει το κατάλληλο tier βάσει αριθμού διαμερισμάτων.

        Args:
            plan_category: 'free', 'web', 'premium', ή 'premium_iot'
            apartment_count: Αριθμός διαμερισμάτων

        Returns:
            PricingTier ή None
        """
        return cls.objects.filter(
            plan_category=plan_category,
            is_active=True,
            min_apartments__lte=apartment_count
        ).filter(
            models.Q(max_apartments__gte=apartment_count) |
            models.Q(max_apartments__isnull=True)
        ).first()

    @classmethod
    def get_price_for_apartments(cls, plan_category: str, apartment_count: int, yearly: bool = False):
        """
        Επιστρέφει την τιμή για συγκεκριμένο αριθμό διαμερισμάτων.

        Returns:
            dict με price, tier_label, stripe_price_id
        """
        tier = cls.get_tier_for_apartments(plan_category, apartment_count)

        if not tier:
            return None
        per_apartment_categories = {'web', 'premium', 'premium_iot'}
        is_per_apartment = plan_category in per_apartment_categories

        def _monthly_price():
            base = tier.monthly_price * apartment_count if is_per_apartment else tier.monthly_price
            return apply_monthly_minimum(plan_category, base, apartment_count)

        def _yearly_price():
            if tier.yearly_price and not is_per_apartment:
                return tier.yearly_price
            yearly_full = _monthly_price() * 12
            discount = yearly_full * (tier.yearly_discount_percent / 100)
            return yearly_full - discount

        if yearly:
            return {
                'price': _yearly_price(),
                'tier_label': tier.tier_label,
                'stripe_price_id': tier.stripe_price_id_yearly,
                'billing_interval': 'year'
            }
        else:
            return {
                'price': _monthly_price(),
                'tier_label': tier.tier_label,
                'stripe_price_id': tier.stripe_price_id_monthly,
                'billing_interval': 'month'
            }


class SubscriptionPlan(models.Model):
    """
    Model για τα διαθέσιμα subscription plans.

    ΣΗΜΕΙΩΣΗ: Τα πεδία monthly_price/yearly_price διατηρούνται για
    backward compatibility, αλλά η πραγματική τιμολόγηση γίνεται
    μέσω του PricingTier model (κλιμακωτή τιμολόγηση).
    """
    PLAN_TYPES = [
        ('free', 'Free'),
        ('web', 'Web'),
        ('premium', 'Premium'),
        ('premium_iot', 'Premium + IoT'),
        # Legacy types for backward compatibility
        ('cloud', 'Cloud (Legacy)'),
        ('kiosk', 'Info Point (Legacy)'),
        # Legacy types for backward compatibility
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    BILLING_INTERVALS = [
        ('month', 'Monthly'),
        ('year', 'Yearly'),
    ]

    name = models.CharField(
        max_length=100,
        help_text='Plan name (e.g., Free, Cloud, Info Point)'
    )

    plan_type = models.CharField(
        max_length=20,
        choices=PLAN_TYPES,
        unique=True,
        help_text='Unique plan identifier'
    )

    description = models.TextField(
        help_text='Plan description and features'
    )

    # Pricing (legacy - για backward compatibility)
    # Η πραγματική τιμολόγηση γίνεται μέσω PricingTier
    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Base monthly price (legacy - use PricingTier for tiered pricing)'
    )

    yearly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Base yearly price (legacy - use PricingTier for tiered pricing)'
    )

    # Νέα πεδία για tier-based pricing
    uses_tiered_pricing = models.BooleanField(
        default=True,
        help_text='If True, pricing is determined by PricingTier based on apartment count'
    )

    includes_kiosk_hardware = models.BooleanField(
        default=False,
        help_text='If True, plan includes Kiosk hardware and installation'
    )

    max_buildings_online_signup = models.PositiveIntegerField(
        default=5,
        help_text='Max buildings for online signup (more = "Contact Us")'
    )

    # Features and limits
    max_buildings = models.IntegerField(
        default=1,
        help_text='Maximum number of buildings allowed (999999 for unlimited)'
    )

    max_apartments = models.IntegerField(
        default=10,
        help_text='Maximum number of apartments allowed (999999 for unlimited)'
    )

    max_users = models.IntegerField(
        default=5,
        help_text='Maximum number of users allowed (999999 for unlimited)'
    )

    max_api_calls = models.PositiveIntegerField(
        default=10000,
        help_text='Maximum API calls per month'
    )

    max_storage_gb = models.PositiveIntegerField(
        default=1,
        help_text='Maximum storage in GB'
    )

    # Features
    has_analytics = models.BooleanField(
        default=False,
        help_text='Advanced analytics features'
    )

    has_custom_integrations = models.BooleanField(
        default=False,
        help_text='Custom API integrations'
    )

    has_priority_support = models.BooleanField(
        default=False,
        help_text='Priority customer support'
    )

    has_white_label = models.BooleanField(
        default=False,
        help_text='White-label solution'
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this plan is available for new subscriptions'
    )

    trial_days = models.PositiveIntegerField(
        default=14,
        help_text='Free trial period in days'
    )

    # Stripe integration
    stripe_price_id_monthly = models.CharField(
        max_length=100,
        blank=True,
        help_text='Stripe price ID for monthly billing'
    )

    stripe_price_id_yearly = models.CharField(
        max_length=100,
        blank=True,
        help_text='Stripe price ID for yearly billing'
    )

    stripe_product_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Stripe product ID'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Subscription Plan'
        verbose_name_plural = 'Subscription Plans'
        ordering = ['monthly_price']

    def __str__(self):
        return f"{self.name} (€{self.monthly_price}/month)"

    @property
    def yearly_discount_percentage(self):
        """Calculate yearly discount percentage"""
        if self.yearly_price == 0:
            return 0
        yearly_monthly_equivalent = self.yearly_price / 12
        return round(((self.monthly_price - yearly_monthly_equivalent) / self.monthly_price) * 100, 1)


class UserSubscription(models.Model):
    """
    Model για τα user subscriptions
    """
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('unpaid', 'Unpaid'),
        ('paused', 'Paused'),
    ]

    BILLING_INTERVALS = [
        ('month', 'Monthly'),
        ('year', 'Yearly'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        help_text='User who owns this subscription'
    )

    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        help_text='Subscription plan'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='trial',
        help_text='Current subscription status'
    )

    billing_interval = models.CharField(
        max_length=10,
        choices=BILLING_INTERVALS,
        default='month',
        help_text='Billing frequency'
    )

    # Dates
    trial_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Trial period start date'
    )

    trial_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Trial period end date'
    )

    current_period_start = models.DateTimeField(
        help_text='Current billing period start'
    )

    current_period_end = models.DateTimeField(
        help_text='Current billing period end'
    )

    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When subscription was canceled'
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        help_text='Whether subscription will cancel at period end'
    )

    # Payment
    stripe_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe subscription ID'
    )

    stripe_customer_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe customer ID'
    )

    payment_method_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Default payment method ID'
    )

    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Current subscription price'
    )

    currency = models.CharField(
        max_length=3,
        default='EUR',
        help_text='Currency code'
    )

    # Tenant Information
    tenant_domain = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Tenant domain for this subscription (e.g., etherm2021.localhost)'
    )

    # ------------------------------------------------------------------
    # Per-apartment billing (Stripe subscription items)
    # ------------------------------------------------------------------
    # We keep the legacy `plan` + `price` fields for backward compatibility,
    # but the canonical billing model is:
    # - web_per_apartment (quantity = total_apartments)
    # - premium_addon_per_apartment (quantity = premium_apartments)
    # - iot_addon_per_apartment (quantity = iot_apartments)
    stripe_subscription_item_id_web = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe subscription item ID for Web per-apartment line item'
    )
    stripe_subscription_item_id_premium = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe subscription item ID for Premium add-on per-apartment line item'
    )
    stripe_subscription_item_id_iot = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe subscription item ID for IoT add-on per-apartment line item'
    )
    billing_total_apartments = models.PositiveIntegerField(
        default=0,
        help_text='Last synced total apartments (sum of Building.apartments_count across tenant)'
    )
    billing_premium_apartments = models.PositiveIntegerField(
        default=0,
        help_text='Last synced premium apartments (sum of Building.apartments_count where premium_enabled=true)'
    )
    billing_iot_apartments = models.PositiveIntegerField(
        default=0,
        help_text='Last synced IoT apartments (sum of Building.apartments_count where iot_enabled=true)'
    )

    # Stripe checkout session ID for idempotency
    stripe_checkout_session_id = models.CharField(
        max_length=255,
        blank=True,
        unique=True,
        help_text='Stripe checkout session ID for idempotency'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Subscription'
        verbose_name_plural = 'User Subscriptions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['stripe_subscription_id']),
            models.Index(fields=['current_period_end']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    @property
    def is_trial(self):
        """Check if subscription is in trial period"""
        if not self.trial_end:
            return False
        return timezone.now() < self.trial_end

    @property
    def is_active(self):
        """Check if subscription is active"""
        return self.status in ['trial', 'active']

    @property
    def days_until_renewal(self):
        """Days until next billing cycle"""
        if self.current_period_end:
            delta = self.current_period_end - timezone.now()
            return max(0, delta.days)
        return 0

    def start_trial(self, days=None):
        """Start trial period"""
        if days is None:
            days = self.plan.trial_days

        self.trial_start = timezone.now()
        self.trial_end = self.trial_start + timezone.timedelta(days=days)
        self.status = 'trial'
        self.save()


class BillingCycle(models.Model):
    """
    Model για τα billing cycles
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.CASCADE,
        related_name='billing_cycles',
        help_text='Associated subscription'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Billing cycle status'
    )

    # Period
    period_start = models.DateTimeField(
        help_text='Billing period start date'
    )

    period_end = models.DateTimeField(
        help_text='Billing period end date'
    )

    # Amounts
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Subtotal before tax'
    )

    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Tax amount'
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Total amount including tax'
    )

    currency = models.CharField(
        max_length=3,
        default='EUR',
        help_text='Currency code'
    )

    # Payment
    stripe_invoice_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe invoice ID'
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When payment was completed'
    )

    # Dates
    due_date = models.DateTimeField(
        help_text='Payment due date'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Billing Cycle'
        verbose_name_plural = 'Billing Cycles'
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['subscription', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['stripe_invoice_id']),
        ]

    def __str__(self):
        return f"{self.subscription.user.email} - {self.period_start.date()} ({self.status})"

    # ------------------------------------------------------------------
    # Backward-compatible aliases (serializers/analytics expect these names)
    # ------------------------------------------------------------------
    @property
    def amount_due(self):
        """
        Backward compatibility for older code/serializers.

        Historically the code referenced `amount_due`; the canonical field is `total_amount`.
        """
        return self.total_amount

    @property
    def amount_paid(self):
        """
        Backward compatibility for older code/serializers.

        This project does not model partial payments per billing cycle.
        If the cycle is paid, treat `amount_paid` as `total_amount`, else 0.
        """
        if self.status == "paid":
            return self.total_amount
        return Decimal("0.00")


class UsageTracking(models.Model):
    """
    Model για την παρακολούθηση χρήσης
    """
    METRIC_TYPES = [
        ('api_calls', 'API Calls'),
        ('storage_gb', 'Storage (GB)'),
        ('buildings', 'Buildings'),
        ('apartments', 'Apartments'),
        ('users', 'Users'),
        ('sms', 'SMS'),
    ]

    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.CASCADE,
        related_name='usage_records',
        help_text='Associated subscription'
    )

    metric_type = models.CharField(
        max_length=20,
        choices=METRIC_TYPES,
        help_text='Type of usage metric'
    )

    usage_count = models.PositiveIntegerField(
        help_text='Usage count for this metric'
    )

    usage_limit = models.PositiveIntegerField(
        help_text='Usage limit for this metric'
    )

    period_start = models.DateTimeField(
        help_text='Usage tracking period start'
    )

    period_end = models.DateTimeField(
        help_text='Usage tracking period end'
    )

    recorded_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When this usage was recorded'
    )

    class Meta:
        verbose_name = 'Usage Tracking'
        verbose_name_plural = 'Usage Tracking'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['subscription', 'metric_type']),
            models.Index(fields=['period_start', 'period_end']),
        ]
        unique_together = ['subscription', 'metric_type', 'period_start']

    def __str__(self):
        return f"{self.subscription.user.email} - {self.metric_type}: {self.usage_count}/{self.usage_limit}"

    # ------------------------------------------------------------------
    # Backward-compatible aliases (serializers/analytics expect these names)
    # ------------------------------------------------------------------
    @property
    def current_value(self):
        """Alias for `usage_count`."""
        return self.usage_count

    @property
    def limit_value(self):
        """Alias for `usage_limit`."""
        return self.usage_limit

    @property
    def usage_percentage(self):
        """Calculate usage as percentage of limit"""
        if self.usage_limit == 0:
            return 0
        return min(100, (self.usage_count / self.usage_limit) * 100)

    @property
    def is_over_limit(self):
        """Check if usage exceeds limit"""
        return self.usage_count > self.usage_limit


class PaymentMethod(models.Model):
    """
    Model για τα payment methods
    """
    PAYMENT_TYPES = [
        ('card', 'Credit Card'),
        ('sepa', 'SEPA Direct Debit'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods',
        help_text='User who owns this payment method'
    )

    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        help_text='Type of payment method'
    )

    # Stripe payment method ID
    stripe_payment_method_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Stripe payment method ID'
    )

    # Card details (for display purposes only)
    card_brand = models.CharField(
        max_length=20,
        blank=True,
        help_text='Card brand (Visa, Mastercard, etc.)'
    )

    card_last4 = models.CharField(
        max_length=4,
        blank=True,
        help_text='Last 4 digits of card'
    )

    card_exp_month = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
        help_text='Card expiration month'
    )

    card_exp_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Card expiration year'
    )

    is_default = models.BooleanField(
        default=False,
        help_text='Default payment method for this user'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this payment method is active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Payment Method'
        verbose_name_plural = 'Payment Methods'
        ordering = ['-is_default', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['stripe_payment_method_id']),
        ]

    def __str__(self):
        if self.payment_type == 'card' and self.card_last4:
            return f"{self.card_brand} •••• {self.card_last4}"
        return f"{self.get_payment_type_display()}"

    def save(self, *args, **kwargs):
        # Ensure only one default payment method per user
        if self.is_default:
            PaymentMethod.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)
