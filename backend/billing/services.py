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
            # Create or get Stripe customer
            if not user.stripe_customer_id:
                customer_id = StripeService.create_customer(user)
                if not customer_id:
                    raise Exception("Failed to create Stripe customer")
                user.stripe_customer_id = customer_id
                user.save()
            
            # Attach payment method if provided
            if payment_method_id:
                payment_method_data = StripeService.create_payment_method(
                    payment_method_id, user.stripe_customer_id
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
                user.stripe_customer_id, price_id, trial_days
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
            
            # Calculate current period dates
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
                stripe_customer_id=user.stripe_customer_id,
                price=price,
                currency=settings.STRIPE_CURRENCY.upper(),
                auto_renew=True,
                is_trial=bool(trial_days)
            )
            
            # Create initial billing cycle
            BillingCycle.objects.create(
                subscription=subscription,
                period_start=current_period_start,
                period_end=current_period_end,
                amount_due=price,
                currency=settings.STRIPE_CURRENCY.upper(),
                status='pending' if trial_days else 'paid',
                due_date=current_period_end
            )
            
            # Initialize usage tracking
            BillingService._initialize_usage_tracking(subscription)
            
            logger.info(f"Created subscription {subscription.id} for user {user.email}")
            return subscription
            
        except Exception as e:
            logger.error(f"Failed to create subscription for user {user.email}: {e}")
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
            subscription.status = 'cancelled'
            if cancel_at_period_end:
                subscription.cancel_at_period_end = True
            else:
                subscription.cancelled_at = timezone.now()
            subscription.save()
            
            logger.info(f"Cancelled subscription {subscription.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel subscription {subscription.id}: {e}")
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
        if usage_tracking.limit_value == -1:
            return True
        
        # Check if within limit
        new_value = usage_tracking.current_value + increment
        return new_value <= usage_tracking.limit_value
    
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
                'current_value': 0,
                'limit_value': BillingService._get_limit_for_metric(subscription.plan, metric_type)
            }
        )
        
        if not created:
            usage_tracking.current_value += increment
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
                current_value=0,
                limit_value=BillingService._get_limit_for_metric(subscription.plan, metric),
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
                limit_value=BillingService._get_limit_for_metric(subscription.plan, metric)
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
        logger.info(f"Subscription created: {event_data['id']}")
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
            
            # Update trial dates if present
            if event_data.get('trial_start'):
                subscription.trial_start = timezone.datetime.fromtimestamp(
                    event_data['trial_start'], tz=timezone.utc
                )
            if event_data.get('trial_end'):
                subscription.trial_end = timezone.datetime.fromtimestamp(
                    event_data['trial_end'], tz=timezone.utc
                )
            
            # Update current period
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                event_data['current_period_start'], tz=timezone.utc
            )
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                event_data['current_period_end'], tz=timezone.utc
            )
            
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
        subscription_id = event_data['id']
        
        try:
            subscription = UserSubscription.objects.get(
                stripe_subscription_id=subscription_id
            )
            
            subscription.status = 'cancelled'
            subscription.cancelled_at = timezone.now()
            subscription.save()
            
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
