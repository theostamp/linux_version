# billing/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class SubscriptionPlan(models.Model):
    """
    Model για τα διαθέσιμα subscription plans
    """
    PLAN_TYPES = [
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
        help_text='Plan name (e.g., Starter, Professional, Enterprise)'
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
    
    # Pricing
    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Monthly price in EUR'
    )
    
    yearly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Yearly price in EUR'
    )
    
    # Features and limits
    max_buildings = models.PositiveIntegerField(
        default=1,
        help_text='Maximum number of buildings allowed'
    )
    
    max_apartments = models.PositiveIntegerField(
        default=10,
        help_text='Maximum number of apartments allowed'
    )
    
    max_users = models.PositiveIntegerField(
        default=5,
        help_text='Maximum number of users allowed'
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
