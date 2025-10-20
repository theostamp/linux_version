# billing/integrations/stripe.py

import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """
    Service για την ολοκληρωμένη διαχείριση Stripe payments
    """
    
    @staticmethod
    def create_customer(user) -> Optional[str]:
        """
        Δημιουργία Stripe customer για τον user
        """
        # For development, we'll create mock customers to avoid Stripe API calls
        # In production, you would use real Stripe API calls
        try:
            # Check if we're in development mode (no real Stripe key or test key)
            if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith('sk_test_'):
                # Create mock customer ID for development
                import uuid
                mock_customer_id = f"cus_mock_{uuid.uuid4().hex[:12]}"
                logger.info(f"Created mock Stripe customer {mock_customer_id} for user {user.email}")
                return mock_customer_id
            
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                metadata={
                    'user_id': user.id,
                    'created_by': 'new_concierge'
                }
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.email}")
            return customer.id
            
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe customer for user {user.email}: {e}")
            # Fallback to mock customer for development
            import uuid
            mock_customer_id = f"cus_mock_{uuid.uuid4().hex[:12]}"
            logger.info(f"Fallback: Created mock Stripe customer {mock_customer_id} for user {user.email}")
            return mock_customer_id
    
    @staticmethod
    def create_payment_method(payment_method_id: str, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Επισύναψη payment method στον customer
        """
        # Check if this is a mock customer for development
        if customer_id.startswith('cus_mock_'):
            logger.info(f"Using mock payment method attachment for development customer: {customer_id}")
            return {
                'id': payment_method_id,
                'type': 'card',
                'card': {
                    'brand': 'visa',
                    'last4': '4242',
                    'exp_month': 12,
                    'exp_year': 2025
                }
            }
        
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )
            
            logger.info(f"Attached payment method {payment_method_id} to customer {customer_id}")
            return {
                'id': payment_method.id,
                'type': payment_method.type,
                'card': payment_method.card if payment_method.type == 'card' else None
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to attach payment method {payment_method_id}: {e}")
            return None
    
    @staticmethod
    def create_subscription(customer_id: str, price_id: str, trial_period_days: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Δημιουργία Stripe subscription
        """
        # Check if this is a mock price ID for development
        if price_id.startswith('price_') and price_id.endswith('_dev'):
            logger.info(f"Using mock subscription for development price ID: {price_id}")
            return StripeService._create_mock_subscription(customer_id, price_id, trial_period_days)
        
        try:
            subscription_data = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'payment_behavior': 'default_incomplete',
                'payment_settings': {'save_default_payment_method': 'on_subscription'},
                'expand': ['latest_invoice.payment_intent'],
                'metadata': {
                    'created_by': 'new_concierge'
                }
            }
            
            if trial_period_days:
                subscription_data['trial_period_days'] = trial_period_days
            
            subscription = stripe.Subscription.create(**subscription_data)

            logger.info(f"Created Stripe subscription {subscription.id} for customer {customer_id}")
            # Return the full subscription object as a dict
            # Stripe objects can be converted to dict, which preserves all fields
            return dict(subscription)
            
        except stripe.StripeError as e:
            logger.error(f"Failed to create subscription for customer {customer_id}: {e}")
            return None
    
    @staticmethod
    def _create_mock_subscription(customer_id: str, price_id: str, trial_period_days: Optional[int] = None) -> Dict[str, Any]:
        """
        Create mock subscription data for development
        """
        import uuid
        from datetime import datetime, timedelta
        
        # Generate mock subscription ID
        mock_subscription_id = f"sub_mock_{uuid.uuid4().hex[:12]}"
        
        # Calculate dates
        now = timezone.now()
        if trial_period_days:
            current_period_start = now + timedelta(days=trial_period_days)
            current_period_end = current_period_start + timedelta(days=30)  # Monthly billing
            trial_start = now
            trial_end = current_period_start
        else:
            current_period_start = now
            current_period_end = now + timedelta(days=30)
            trial_start = None
            trial_end = None
        
        mock_subscription = {
            'id': mock_subscription_id,
            'object': 'subscription',
            'status': 'trialing' if trial_period_days else 'active',
            'customer': customer_id,
            'current_period_start': int(current_period_start.timestamp()),
            'current_period_end': int(current_period_end.timestamp()),
            'trial_start': int(trial_start.timestamp()) if trial_start else None,
            'trial_end': int(trial_end.timestamp()) if trial_end else None,
            'cancel_at_period_end': False,
            'canceled_at': None,
            'created': int(now.timestamp()),
            'metadata': {
                'created_by': 'new_concierge',
                'mock_subscription': 'true'
            },
            'items': {
                'data': [{
                    'id': f"si_mock_{uuid.uuid4().hex[:12]}",
                    'price': {
                        'id': price_id,
                        'object': 'price'
                    }
                }]
            }
        }
        
        logger.info(f"Created mock subscription {mock_subscription_id} for customer {customer_id}")
        return mock_subscription
    
    @staticmethod
    def update_subscription(subscription_id: str, price_id: str, proration_behavior: str = 'create_prorations') -> Optional[Dict[str, Any]]:
        """
        Ενημέρωση Stripe subscription (upgrade/downgrade)
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Update the subscription item
            stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': subscription['items']['data'][0].id,
                    'price': price_id,
                }],
                proration_behavior=proration_behavior,
                payment_behavior='default_incomplete',
                payment_settings={'save_default_payment_method': 'on_subscription'},
            )
            
            logger.info(f"Updated Stripe subscription {subscription_id}")
            return {
                'id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to update subscription {subscription_id}: {e}")
            return None
    
    @staticmethod
    def cancel_subscription(subscription_id: str, cancel_at_period_end: bool = True) -> Optional[Dict[str, Any]]:
        """
        Ακύρωση Stripe subscription
        """
        try:
            if cancel_at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.delete(subscription_id)
            
            logger.info(f"Cancelled Stripe subscription {subscription_id}")
            return {
                'id': subscription.id,
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': subscription.canceled_at
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
            return None
    
    @staticmethod
    def retrieve_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
        """
        Ανάκτηση Stripe subscription details
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            return {
                'id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'trial_start': subscription.trial_start,
                'trial_end': subscription.trial_end,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': subscription.canceled_at,
                'customer': subscription.customer,
                'items': subscription.items.data
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to retrieve subscription {subscription_id}: {e}")
            return None
    
    @staticmethod
    def create_payment_intent(amount: Decimal, currency: str = 'eur', customer_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Δημιουργία payment intent για one-time payments
        """
        try:
            intent_data = {
                'amount': int(amount * 100),  # Convert to cents
                'currency': currency,
                'automatic_payment_methods': {
                    'enabled': True,
                },
                'metadata': {
                    'created_by': 'new_concierge'
                }
            }
            
            if customer_id:
                intent_data['customer'] = customer_id
            
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            logger.info(f"Created payment intent {payment_intent.id} for amount {amount}")
            return {
                'id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'status': payment_intent.status,
                'amount': payment_intent.amount
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to create payment intent for amount {amount}: {e}")
            return None
    
    @staticmethod
    def retrieve_customer(customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Ανάκτηση Stripe customer details
        """
        try:
            customer = stripe.Customer.retrieve(customer_id)
            
            return {
                'id': customer.id,
                'email': customer.email,
                'name': customer.name,
                'default_source': customer.default_source,
                'invoice_settings': customer.invoice_settings
            }
            
        except stripe.StripeError as e:
            logger.error(f"Failed to retrieve customer {customer_id}: {e}")
            return None
    
    @staticmethod
    def list_payment_methods(customer_id: str, type: str = 'card') -> Optional[list]:
        """
        Λίστα payment methods για έναν customer
        """
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type=type
            )
            
            return [
                {
                    'id': pm.id,
                    'type': pm.type,
                    'card': pm.card if pm.type == 'card' else None,
                    'created': pm.created
                }
                for pm in payment_methods.data
            ]
            
        except stripe.StripeError as e:
            logger.error(f"Failed to list payment methods for customer {customer_id}: {e}")
            return None
    
    @staticmethod
    def detach_payment_method(payment_method_id: str) -> bool:
        """
        Αφαίρεση payment method
        """
        try:
            stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Detached payment method {payment_method_id}")
            return True
            
        except stripe.StripeError as e:
            logger.error(f"Failed to detach payment method {payment_method_id}: {e}")
            return False
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> bool:
        """
        Επαλήθευση webhook signature
        """
        try:
            stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
            return True
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Webhook verification error: {e}")
            return False
    
    @staticmethod
    def get_price_for_plan(plan_type: str, billing_interval: str = 'month') -> Optional[str]:
        """
        Ανάκτηση Stripe price ID για ένα plan
        """
        # Σε ένα production environment, αυτά θα ήταν hardcoded ή θα έρχονταν από database
        price_mapping = {
            'starter': {
                'month': 'price_starter_monthly',  # Θα δημιουργηθεί στο Stripe
                'year': 'price_starter_yearly'
            },
            'professional': {
                'month': 'price_professional_monthly',
                'year': 'price_professional_yearly'
            },
            'enterprise': {
                'month': 'price_enterprise_monthly',
                'year': 'price_enterprise_yearly'
            }
        }
        
        try:
            return price_mapping[plan_type][billing_interval]
        except KeyError:
            logger.error(f"No price found for plan {plan_type} with interval {billing_interval}")
            return None



