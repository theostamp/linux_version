# billing/services.py

from django.conf import settings
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from typing import Optional, Dict, Any
import logging

from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle,
    UsageTracking, PaymentMethod
)
from .integrations.stripe import StripeService
from users.models import CustomUser
from users.services import EmailService

logger = logging.getLogger(__name__)


class BillingService:
    """
    Core billing service για τη διαχείριση subscriptions και payments
    """

    @staticmethod
    @transaction.atomic
    def create_subscription(user: CustomUser, plan: SubscriptionPlan,
                          billing_interval: str = 'month',
                          payment_method_id: Optional[str] = None) -> Optional[UserSubscription]:
        """
        Δημιουργία νέας subscription για user
        """
        try:
            # Create Stripe customer
            customer_id = StripeService.create_customer(user)
            if not customer_id:
                raise Exception("Failed to create Stripe customer")
            stripe_customer_id = customer_id

            # Attach payment method if provided
            if payment_method_id:
                payment_method_data = StripeService.create_payment_method(
                    payment_method_id, stripe_customer_id
                )
                if not payment_method_data:
                    raise Exception("Failed to attach payment method")

            # Get Stripe price ID
            price_id = None
            if billing_interval == 'month':
                price_id = plan.stripe_price_id_monthly
            elif billing_interval == 'year':
                price_id = plan.stripe_price_id_yearly

            if not price_id:
                raise Exception(f"No Stripe price ID found for plan {plan.plan_type} with interval {billing_interval}")

            # Create Stripe subscription
            trial_days = plan.trial_days if plan.trial_days > 0 else None
            stripe_subscription = StripeService.create_subscription(
                stripe_customer_id, price_id, trial_days
            )

            if not stripe_subscription:
                raise Exception("Failed to create Stripe subscription")

            # Calculate pricing
            price = plan.monthly_price if billing_interval == 'month' else plan.yearly_price

            # Calculate trial dates
            trial_start = None
            trial_end = None
            if trial_days:
                trial_start = timezone.now()
                trial_end = trial_start + timezone.timedelta(days=trial_days)

            # Calculate current period dates from Stripe response
            if stripe_subscription:
                # Get current_period_start and current_period_end from the subscription object
                # NOTE: These fields are at the subscription level, not in the items
                current_period_start = timezone.datetime.fromtimestamp(
                    stripe_subscription.get('current_period_start', timezone.now().timestamp()),
                    tz=timezone.get_current_timezone()
                )
                current_period_end = timezone.datetime.fromtimestamp(
                    stripe_subscription.get('current_period_end', (timezone.now() + timezone.timedelta(days=30)).timestamp()),
                    tz=timezone.get_current_timezone()
                )
            else:
                # Fallback to trial dates or current time
                current_period_start = trial_end if trial_end else timezone.now()
                current_period_end = current_period_start + timezone.timedelta(
                    days=30 if billing_interval == 'month' else 365
                )

            # Create UserSubscription
            subscription = UserSubscription.objects.create(
                user=user,
                plan=plan,
                status='trial' if trial_days else 'active',
                billing_interval=billing_interval,
                trial_start=trial_start,
                trial_end=trial_end,
                current_period_start=current_period_start,
                current_period_end=current_period_end,
                stripe_subscription_id=stripe_subscription['id'],
                stripe_customer_id=stripe_customer_id,
                price=price,
                currency=settings.STRIPE_CURRENCY.upper()
            )

            # Grant manager role to user with subscription
            # User who pays for subscription is a manager (not a resident)
            if not user.role:
                user.role = 'manager'  # SystemRole.OFFICE_MANAGER
                user.save(update_fields=['role'])
                logger.info(f"Granted manager role to user {user.email}")

            # Create personal tenant for the user if they don't have one
            # ARCHITECTURAL BOUNDARY: Delegate tenant creation to TenantService
            from django_tenants.utils import get_tenant_domain_model
            from tenants.services import TenantService
            import re

            DomainModel = get_tenant_domain_model()

            # If the user already has a tenant, re-use it (resubscribe/upgrade flows).
            if getattr(user, 'tenant', None):
                existing_domain = DomainModel.objects.filter(tenant=user.tenant).first()
                if existing_domain:
                    subscription.tenant_domain = existing_domain.domain
                    subscription.save(update_fields=['tenant_domain'])
                    logger.info(
                        "Stored existing tenant domain '%s' in subscription for user %s",
                        subscription.tenant_domain,
                        user.email,
                    )
            else:
                # Generate tenant schema name from email (clean and simple)
                # Use only the email prefix (before @), sanitized for database safety
                email_prefix = user.email.split('@')[0]
                safe_schema = re.sub(r'[^a-z0-9]', '', email_prefix.lower())[:30]

                # Check if user already has a tenant (search by domain pattern)
                # This prevents creating multiple tenants for the same user
                user_domain_pattern = f"{safe_schema}"
                existing_domain = DomainModel.objects.filter(domain__istartswith=user_domain_pattern).first()
                if existing_domain:
                    existing_tenant = existing_domain.tenant
                    logger.info(f"User {user.email} already has tenant '{existing_tenant.schema_name}'")

                    # Store existing tenant domain in subscription
                    subscription.tenant_domain = existing_domain.domain
                    subscription.save(update_fields=['tenant_domain'])
                    logger.info(f"Stored existing tenant domain '{subscription.tenant_domain}' in subscription")
                else:
                    # Create new tenant infrastructure using TenantService
                    # This maintains proper separation: TenantService handles tenant infrastructure,
                    # BillingService handles Stripe + subscriptions
                    tenant_service = TenantService()
                    tenant, domain = tenant_service.create_tenant_infrastructure(
                        schema_name=safe_schema,
                        user=user,
                        paid_until=current_period_end.date() if hasattr(current_period_end, 'date') else current_period_end,
                        on_trial=bool(trial_days)
                    )

                    # Store tenant domain in subscription for easy access
                    subscription.tenant_domain = domain.domain
                    subscription.save(update_fields=['tenant_domain'])
                    logger.info(f"Stored tenant domain '{subscription.tenant_domain}' in subscription")

            # Create initial billing cycle
            BillingCycle.objects.create(
                subscription=subscription,
                period_start=current_period_start,
                period_end=current_period_end,
                subtotal=price,
                tax_amount=0,
                total_amount=price,
                currency=settings.STRIPE_CURRENCY.upper(),
                status='pending' if trial_days else 'paid',
                due_date=current_period_end
            )

            # Initialize usage tracking
            BillingService._initialize_usage_tracking(subscription)

            logger.info(f"Created subscription {subscription.id} for user {user.email}")
            return subscription

        except Exception as e:
            import traceback
            logger.error(f"Failed to create subscription for user {user.email}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

    @staticmethod
    @transaction.atomic
    def update_subscription(subscription: UserSubscription, new_plan: SubscriptionPlan) -> bool:
        """
        Upgrade/downgrade subscription
        """
        try:
            # Get new price ID
            price_id = None
            if subscription.billing_interval == 'month':
                price_id = new_plan.stripe_price_id_monthly
            elif subscription.billing_interval == 'year':
                price_id = new_plan.stripe_price_id_yearly

            if not price_id:
                raise Exception(f"No Stripe price ID found for plan {new_plan.plan_type}")

            # Update Stripe subscription
            stripe_subscription = StripeService.update_subscription(
                subscription.stripe_subscription_id, price_id
            )

            if not stripe_subscription:
                raise Exception("Failed to update Stripe subscription")

            # Update local subscription
            subscription.plan = new_plan
            subscription.price = new_plan.monthly_price if subscription.billing_interval == 'month' else new_plan.yearly_price
            subscription.save()

            # Update usage tracking limits
            BillingService._update_usage_limits(subscription)

            logger.info(f"Updated subscription {subscription.id} to plan {new_plan.plan_type}")
            return True

        except Exception as e:
            logger.error(f"Failed to update subscription {subscription.id}: {e}")
            return False

    @staticmethod
    @transaction.atomic
    def cancel_subscription(subscription: UserSubscription,
                          cancel_at_period_end: bool = True) -> bool:
        """
        Ακύρωση subscription
        """
        try:
            # Cancel Stripe subscription
            stripe_subscription = StripeService.cancel_subscription(
                subscription.stripe_subscription_id, cancel_at_period_end
            )

            if not stripe_subscription:
                raise Exception("Failed to cancel Stripe subscription")

            # Update local subscription
            if cancel_at_period_end:
                subscription.cancel_at_period_end = True
                subscription.status = stripe_subscription.get('status', subscription.status)
                subscription.canceled_at = None
            else:
                subscription.cancel_at_period_end = False
                subscription.status = 'canceled'
                subscription.canceled_at = timezone.now()
            subscription.save()

            logger.info(f"Cancelled subscription {subscription.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to cancel subscription {subscription.id}: {e}")
            return False

    @staticmethod
    @transaction.atomic
    def reactivate_subscription(subscription: UserSubscription) -> bool:
        """
        Reactivate subscription by clearing cancel_at_period_end.
        """
        try:
            if not subscription.stripe_subscription_id:
                raise Exception("Missing Stripe subscription ID")

            stripe_subscription = StripeService.reactivate_subscription(subscription.stripe_subscription_id)
            if not stripe_subscription:
                raise Exception("Failed to reactivate Stripe subscription")

            subscription.cancel_at_period_end = False
            subscription.canceled_at = None
            subscription.status = stripe_subscription.get('status', 'active')
            subscription.save()

            logger.info(f"Reactivated subscription {subscription.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to reactivate subscription {subscription.id}: {e}")
            return False

    @staticmethod
    def get_user_subscription(user: CustomUser) -> Optional[UserSubscription]:
        """
        Ανάκτηση active subscription για user
        """
        return UserSubscription.objects.filter(
            user=user,
            status__in=['trial', 'active']
        ).first()

    @staticmethod
    def check_usage_limits(subscription: UserSubscription,
                          metric_type: str, increment: int = 1) -> bool:
        """
        Έλεγχος αν ο user έχει ξεπεράσει τα limits του plan
        """
        usage_tracking = UsageTracking.objects.filter(
            subscription=subscription,
            metric_type=metric_type,
            period_start__lte=timezone.now(),
            period_end__gte=timezone.now()
        ).first()

        if not usage_tracking:
            return True  # No tracking means no limit

        # Check if unlimited (-1)
        if usage_tracking.usage_limit == -1:
            return True

        # Check if within limit
        new_value = usage_tracking.usage_count + increment
        return new_value <= usage_tracking.usage_limit

    @staticmethod
    @transaction.atomic
    def increment_usage(subscription: UserSubscription,
                       metric_type: str, increment: int = 1) -> bool:
        """
        Αύξηση usage counter
        """
        usage_tracking, created = UsageTracking.objects.get_or_create(
            subscription=subscription,
            metric_type=metric_type,
            period_start=timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            period_end=timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timezone.timedelta(days=32),
            defaults={
                'usage_count': 0,
                'usage_limit': BillingService._get_limit_for_metric(subscription.plan, metric_type)
            }
        )

        if not created:
            usage_tracking.usage_count += increment
            usage_tracking.save()

        return True

    @staticmethod
    def _initialize_usage_tracking(subscription: UserSubscription):
        """
        Αρχικοποίηση usage tracking για όλα τα metrics
        """
        metrics = ['api_calls', 'buildings', 'apartments', 'users', 'storage_gb']

        for metric in metrics:
            UsageTracking.objects.create(
                subscription=subscription,
                metric_type=metric,
                usage_count=0,
                usage_limit=BillingService._get_limit_for_metric(subscription.plan, metric),
                period_start=timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0),
                period_end=timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timezone.timedelta(days=32)
            )

    @staticmethod
    def _update_usage_limits(subscription: UserSubscription):
        """
        Ενημέρωση usage limits μετά από plan change
        """
        metrics = ['api_calls', 'buildings', 'apartments', 'users', 'storage_gb']

        for metric in metrics:
            UsageTracking.objects.filter(
                subscription=subscription,
                metric_type=metric
            ).update(
                usage_limit=BillingService._get_limit_for_metric(subscription.plan, metric)
            )

    @staticmethod
    def _get_limit_for_metric(plan: SubscriptionPlan, metric: str) -> int:
        """
        Ανάκτηση limit για συγκεκριμένο metric από το plan
        """
        limits = {
            'api_calls': plan.max_api_calls,
            'buildings': plan.max_buildings,
            'apartments': plan.max_apartments,
            'users': plan.max_users,
            'storage_gb': plan.max_storage_gb
        }

        return limits.get(metric, -1)

    @staticmethod
    @transaction.atomic
    def generate_invoice(subscription: UserSubscription) -> Optional[BillingCycle]:
        """
        Generate new invoice για subscription
        """
        try:
            # Calculate next billing period
            if subscription.current_period_end:
                period_start = subscription.current_period_end
                if subscription.billing_interval == 'month':
                    period_end = period_start + timezone.timedelta(days=30)
                else:  # yearly
                    period_end = period_start + timezone.timedelta(days=365)
            else:
                period_start = timezone.now()
                period_end = period_start + timezone.timedelta(days=30)

            # Check for overages
            overage_amount = BillingService._calculate_overage_charges(subscription)
            base_amount = subscription.price
            total_amount = base_amount + overage_amount

            # Create billing cycle
            billing_cycle = BillingCycle.objects.create(
                subscription=subscription,
                period_start=period_start,
                period_end=period_end,
                amount_due=total_amount,
                currency=subscription.currency,
                status='pending',
                due_date=period_end + timezone.timedelta(days=7),  # 7 days grace period
                stripe_invoice_id=''  # Will be filled when Stripe invoice is created
            )

            # Update subscription period
            subscription.current_period_start = period_start
            subscription.current_period_end = period_end
            subscription.save()

            # Send invoice notification
            BillingService._send_invoice_notification(subscription, billing_cycle)

            logger.info(f"Generated invoice {billing_cycle.id} for subscription {subscription.id}")
            return billing_cycle

        except Exception as e:
            logger.error(f"Failed to generate invoice for subscription {subscription.id}: {e}")
            return None

    @staticmethod
    def _calculate_overage_charges(subscription: UserSubscription) -> Decimal:
        """
        Calculate overage charges για usage που ξεπερνά τα limits
        """
        try:
            total_overage = Decimal('0.00')

            # Get current month usage
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (current_month + timezone.timedelta(days=32)).replace(day=1)

            usage_data = UsageTracking.objects.filter(
                subscription=subscription,
                period_start__gte=current_month,
                period_end__lt=next_month
            )

            # Overage rates (per unit)
            overage_rates = {
                'api_calls': Decimal('0.001'),  # €0.001 per API call
                'buildings': Decimal('5.00'),   # €5.00 per building
                'apartments': Decimal('0.50'),  # €0.50 per apartment
                'users': Decimal('2.00'),       # €2.00 per user
                'storage_gb': Decimal('0.10'),  # €0.10 per GB
            }

            for usage in usage_data:
                if usage.usage_limit > 0 and usage.usage_count > usage.usage_limit:
                    overage_units = usage.usage_count - usage.usage_limit
                    rate = overage_rates.get(usage.metric_type, Decimal('0.00'))
                    overage_amount = overage_units * rate
                    total_overage += overage_amount

            return total_overage

        except Exception as e:
            logger.error(f"Error calculating overage charges: {e}")
            return Decimal('0.00')

    @staticmethod
    def _send_invoice_notification(subscription: UserSubscription, billing_cycle: BillingCycle):
        """
        Send invoice notification email
        """
        try:
            user = subscription.user
            EmailService.send_invoice_notification(user, billing_cycle)
            logger.info(f"Sent invoice notification to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send invoice notification: {e}")

    @staticmethod
    def process_payment(billing_cycle: BillingCycle, payment_intent_id: str) -> bool:
        """
        Process payment για billing cycle
        """
        try:
            # Update billing cycle with payment info
            billing_cycle.status = 'paid'
            billing_cycle.amount_paid = billing_cycle.amount_due
            billing_cycle.paid_at = timezone.now()
            billing_cycle.stripe_payment_intent_id = payment_intent_id
            billing_cycle.save()

            # Send payment confirmation
            BillingService._send_payment_confirmation(billing_cycle)

            logger.info(f"Processed payment for billing cycle {billing_cycle.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to process payment for billing cycle {billing_cycle.id}: {e}")
            return False

    @staticmethod
    def _send_payment_confirmation(billing_cycle: BillingCycle):
        """
        Send payment confirmation email
        """
        try:
            user = billing_cycle.subscription.user
            EmailService.send_payment_confirmation(user, billing_cycle)
            logger.info(f"Sent payment confirmation to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send payment confirmation: {e}")

    @staticmethod
    def handle_failed_payment(billing_cycle: BillingCycle, failure_reason: str) -> bool:
        """
        Handle failed payment
        """
        try:
            # Update billing cycle status
            billing_cycle.status = 'failed'
            billing_cycle.save()

            # Send failure notification
            BillingService._send_payment_failure_notification(billing_cycle, failure_reason)

            # Start dunning process if needed
            BillingService._start_dunning_process(billing_cycle)

            logger.info(f"Handled failed payment for billing cycle {billing_cycle.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to handle payment failure for billing cycle {billing_cycle.id}: {e}")
            return False

    @staticmethod
    def _send_payment_failure_notification(billing_cycle: BillingCycle, failure_reason: str):
        """
        Send payment failure notification
        """
        try:
            user = billing_cycle.subscription.user
            EmailService.send_payment_failure_notification(user, billing_cycle, failure_reason)
            logger.info(f"Sent payment failure notification to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send payment failure notification: {e}")

    @staticmethod
    def _start_dunning_process(billing_cycle: BillingCycle):
        """
        Start dunning process για failed payments
        """
        try:
            # Schedule dunning emails
            # This would typically use Celery for delayed tasks
            # For now, we'll just log it
            logger.info(f"Starting dunning process for billing cycle {billing_cycle.id}")

            # In a production environment, you would:
            # 1. Schedule a reminder email for 3 days
            # 2. Schedule a final notice for 7 days
            # 3. Suspend the subscription after 14 days

        except Exception as e:
            logger.error(f"Failed to start dunning process: {e}")

    @staticmethod
    def generate_monthly_invoices():
        """
        Generate invoices για όλες τις active subscriptions
        """
        try:
            # Get all active subscriptions that need invoicing
            subscriptions = UserSubscription.objects.filter(
                status__in=['active', 'trial'],
                current_period_end__lte=timezone.now()
            )

            generated_count = 0
            for subscription in subscriptions:
                invoice = BillingService.generate_invoice(subscription)
                if invoice:
                    generated_count += 1

            logger.info(f"Generated {generated_count} monthly invoices")
            return generated_count

        except Exception as e:
            logger.error(f"Failed to generate monthly invoices: {e}")
            return 0


class PaymentService:
    """
    Service για τη διαχείριση payment methods
    """

    @staticmethod
    @transaction.atomic
    def add_payment_method(user: CustomUser, payment_method_id: str) -> Optional[PaymentMethod]:
        """
        Προσθήκη νέου payment method
        """
        try:
            # Create Stripe payment method
            payment_method_data = StripeService.create_payment_method(
                payment_method_id, user.stripe_customer_id
            )

            if not payment_method_data:
                raise Exception("Failed to create Stripe payment method")

            # Create local payment method
            payment_method = PaymentMethod.objects.create(
                user=user,
                payment_type='card',
                stripe_payment_method_id=payment_method_data['id'],
                card_brand=payment_method_data['card']['brand'],
                card_last4=payment_method_data['card']['last4'],
                card_exp_month=payment_method_data['card']['exp_month'],
                card_exp_year=payment_method_data['card']['exp_year'],
                is_default=not PaymentMethod.objects.filter(user=user).exists()
            )

            logger.info(f"Added payment method {payment_method.id} for user {user.email}")
            return payment_method

        except Exception as e:
            logger.error(f"Failed to add payment method for user {user.email}: {e}")
            return None

    @staticmethod
    @transaction.atomic
    def remove_payment_method(payment_method: PaymentMethod) -> bool:
        """
        Αφαίρεση payment method
        """
        try:
            # Detach from Stripe
            success = StripeService.detach_payment_method(payment_method.stripe_payment_method_id)

            if not success:
                raise Exception("Failed to detach payment method from Stripe")

            # Delete local payment method
            payment_method.delete()

            logger.info(f"Removed payment method {payment_method.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to remove payment method {payment_method.id}: {e}")
            return False

    @staticmethod
    def set_default_payment_method(payment_method: PaymentMethod) -> bool:
        """
        Ορισμός default payment method
        """
        try:
            # Update Stripe customer default payment method
            stripe.Customer.modify(
                payment_method.user.stripe_customer_id,
                invoice_settings={
                    'default_payment_method': payment_method.stripe_payment_method_id
                }
            )

            # Update local payment methods
            PaymentMethod.objects.filter(user=payment_method.user).update(is_default=False)
            payment_method.is_default = True
            payment_method.save()

            logger.info(f"Set default payment method {payment_method.id}")
            return True

        except Exception as e:
            logger.error(f"Failed to set default payment method {payment_method.id}: {e}")
            return False


class WebhookService:
    """
    Service για την επεξεργασία Stripe webhooks
    """

    @staticmethod
    def handle_webhook(event_type: str, event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία Stripe webhook events
        """
        try:
            if event_type == 'customer.subscription.created':
                return WebhookService._handle_subscription_created(event_data)
            elif event_type == 'customer.subscription.updated':
                return WebhookService._handle_subscription_updated(event_data)
            elif event_type == 'customer.subscription.deleted':
                return WebhookService._handle_subscription_deleted(event_data)
            elif event_type == 'invoice.payment_succeeded':
                return WebhookService._handle_payment_succeeded(event_data)
            elif event_type == 'invoice.payment_failed':
                return WebhookService._handle_payment_failed(event_data)
            else:
                logger.info(f"Unhandled webhook event: {event_type}")
                return True

        except Exception as e:
            logger.error(f"Failed to handle webhook event {event_type}: {e}")
            return False

    @staticmethod
    def _handle_subscription_created(event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία subscription created event
        """
        # Usually handled by our create_subscription method
        subscription_id = event_data.get('id', 'unknown')
        logger.info(f"Subscription created: {subscription_id}")
        return True

    @staticmethod
    def _handle_subscription_updated(event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία subscription updated event
        """
        subscription_id = event_data['id']

        try:
            subscription = UserSubscription.objects.get(
                stripe_subscription_id=subscription_id
            )

            # Update status
            subscription.status = event_data['status']
            if 'cancel_at_period_end' in event_data:
                subscription.cancel_at_period_end = bool(event_data['cancel_at_period_end'])

            # Update trial dates if present
            if event_data.get('trial_start'):
                subscription.trial_start = timezone.datetime.fromtimestamp(
                    event_data['trial_start'], tz=timezone.timezone.utc
                )
            if event_data.get('trial_end'):
                subscription.trial_end = timezone.datetime.fromtimestamp(
                    event_data['trial_end'], tz=timezone.timezone.utc
                )

            # Update current period
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                event_data['current_period_start'], tz=timezone.timezone.utc
            )
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                event_data['current_period_end'], tz=timezone.timezone.utc
            )

            # --- 🚀 ΝΕΑ ΠΡΟΣΘΗΚΗ: Συγχρονισμός με τον Tenant ---
            try:
                from django_tenants.utils import tenant_context
                from tenants.models import Client

                tenant = Client.objects.get(users__id=subscription.user.id)
                tenant.is_active = (subscription.status in ['active', 'trial'])
                tenant.paid_until = subscription.current_period_end.date()
                tenant.on_trial = subscription.is_trial
                tenant.save()
                logger.info(f"Synced tenant '{tenant.schema_name}' status from subscription {subscription.id}")
            except Exception as e:
                logger.error(f"Failed to sync tenant status for subscription {subscription.id}: {e}")
            # --- ΤΕΛΟΣ ΠΡΟΣΘΗΚΗΣ ---

            subscription.save()

            logger.info(f"Updated subscription {subscription.id} from webhook")
            return True

        except UserSubscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found in database")
            return True

    @staticmethod
    def _handle_subscription_deleted(event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία subscription deleted event
        """
        subscription_id = event_data.get('id', 'unknown')

        try:
            subscription = UserSubscription.objects.get(
                stripe_subscription_id=subscription_id
            )

            subscription.status = 'canceled'
            subscription.cancel_at_period_end = False
            subscription.canceled_at = timezone.now()
            subscription.save()

            # --- 🚀 ΝΕΑ ΠΡΟΣΘΗΚΗ: Συγχρονισμός με τον Tenant ---
            try:
                from django_tenants.utils import tenant_context
                from tenants.models import Client

                tenant = Client.objects.get(users__id=subscription.user.id)
                tenant.is_active = False
                tenant.save()
                logger.info(f"Deactivated tenant '{tenant.schema_name}' due to cancelled subscription {subscription.id}")
            except Exception as e:
                logger.error(f"Failed to deactivate tenant for subscription {subscription.id}: {e}")
            # --- ΤΕΛΟΣ ΠΡΟΣΘΗΚΗΣ ---

            logger.info(f"Cancelled subscription {subscription.id} from webhook")
            return True

        except UserSubscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found in database")
            return True

    @staticmethod
    def _handle_payment_succeeded(event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία successful payment event
        """
        subscription_id = event_data.get('subscription')

        if subscription_id:
            try:
                subscription = UserSubscription.objects.get(
                    stripe_subscription_id=subscription_id
                )

                # Update billing cycle
                billing_cycle = BillingCycle.objects.filter(
                    subscription=subscription,
                    status='pending'
                ).first()

                if billing_cycle:
                    billing_cycle.status = 'paid'
                    billing_cycle.amount_paid = billing_cycle.amount_due
                    billing_cycle.paid_at = timezone.now()
                    billing_cycle.save()

                logger.info(f"Payment succeeded for subscription {subscription.id}")
                return True

            except UserSubscription.DoesNotExist:
                logger.warning(f"Subscription {subscription_id} not found")
                return True

        return True

    @staticmethod
    def _handle_payment_failed(event_data: Dict[str, Any]) -> bool:
        """
        Επεξεργασία failed payment event
        """
        subscription_id = event_data.get('subscription')

        if subscription_id:
            try:
                subscription = UserSubscription.objects.get(
                    stripe_subscription_id=subscription_id
                )

                # Update billing cycle
                billing_cycle = BillingCycle.objects.filter(
                    subscription=subscription,
                    status='pending'
                ).first()

                if billing_cycle:
                    billing_cycle.status = 'failed'
                    billing_cycle.save()

                logger.info(f"Payment failed for subscription {subscription.id}")
                return True

            except UserSubscription.DoesNotExist:
                logger.warning(f"Subscription {subscription_id} not found")
                return True

        return True
