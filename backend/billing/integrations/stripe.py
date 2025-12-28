# billing/integrations/stripe.py

import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from typing import Optional, Dict, Any
import logging
import json

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
            # Check if we're in development mode (no real Stripe key)
            if not settings.STRIPE_SECRET_KEY:
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
    def ensure_per_apartment_subscription_items(
        *,
        subscription_id: str,
        web_price_id: str,
        premium_price_id: str,
        web_quantity: int,
        premium_quantity: int,
        proration_behavior: str = 'create_prorations',
        remove_other_items: bool = True,
    ) -> Dict[str, Any]:
        """
        Ensure a subscription has the correct per-apartment items and quantities.

        Billing model (2 items):
        - web_per_apartment: quantity = total apartments (min 1 during setup/trial)
        - premium_addon_per_apartment: quantity = premium apartments (0 => item removed)

        In development/mock mode, this returns a deterministic mock response without calling Stripe.
        """
        try:
            # Mock mode shortcut
            is_mock = (
                getattr(settings, 'STRIPE_MOCK_MODE', False)
                or not settings.STRIPE_SECRET_KEY
                or subscription_id.startswith('sub_mock_')
                or web_price_id.endswith('_dev')
                or premium_price_id.endswith('_dev')
            )
            if is_mock:
                import uuid
                web_item_id = f"si_mock_web_{uuid.uuid4().hex[:12]}"
                premium_item_id = (
                    f"si_mock_premium_{uuid.uuid4().hex[:12]}" if premium_quantity > 0 else None
                )
                logger.info(
                    "[StripeService] Mock ensure_per_apartment_subscription_items: sub=%s web=%s(%s) premium=%s(%s)",
                    subscription_id,
                    web_price_id,
                    web_quantity,
                    premium_price_id,
                    premium_quantity,
                )
                return {
                    'ok': True,
                    'mock': True,
                    'web_item_id': web_item_id,
                    'premium_item_id': premium_item_id,
                    'web_quantity': web_quantity,
                    'premium_quantity': premium_quantity,
                }

            # Retrieve subscription (include prices for matching)
            subscription = stripe.Subscription.retrieve(subscription_id, expand=['items.data.price'])
            items = list(subscription.get('items', {}).get('data', []))

            def _find_by_price(price_id: str):
                for it in items:
                    try:
                        if it.get('price', {}).get('id') == price_id:
                            return it
                    except Exception:
                        continue
                return None

            web_item = _find_by_price(web_price_id)
            premium_item = _find_by_price(premium_price_id)
            allowed_price_ids = {web_price_id, premium_price_id}
            other_items = [it for it in items if it.get('price', {}).get('id') not in allowed_price_ids]

            update_items = []

            # Web item upsert (always present)
            if web_item:
                update_items.append({
                    'id': web_item['id'],
                    'price': web_price_id,
                    'quantity': int(web_quantity),
                })
                web_item_id = web_item['id']
            else:
                update_items.append({
                    'price': web_price_id,
                    'quantity': int(web_quantity),
                })
                web_item_id = None  # will be resolved after modify

            # Premium item: present only if quantity > 0
            premium_item_id = None
            if premium_quantity > 0:
                if premium_item:
                    update_items.append({
                        'id': premium_item['id'],
                        'price': premium_price_id,
                        'quantity': int(premium_quantity),
                    })
                    premium_item_id = premium_item['id']
                else:
                    update_items.append({
                        'price': premium_price_id,
                        'quantity': int(premium_quantity),
                    })
            else:
                # If premium item exists but should be 0, remove it
                if premium_item:
                    update_items.append({
                        'id': premium_item['id'],
                        'deleted': True,
                    })

            # Remove other legacy items to avoid double billing (when enabled)
            if remove_other_items:
                for it in other_items:
                    if it and it.get('id'):
                        update_items.append({'id': it['id'], 'deleted': True})

            updated = stripe.Subscription.modify(
                subscription_id,
                items=update_items,
                proration_behavior=proration_behavior,
            )

            # Resolve item IDs after update
            updated_items = list(updated.get('items', {}).get('data', []))
            for it in updated_items:
                if it.get('price', {}).get('id') == web_price_id:
                    web_item_id = it.get('id')
                if it.get('price', {}).get('id') == premium_price_id:
                    premium_item_id = it.get('id')

            return {
                'ok': True,
                'mock': False,
                'web_item_id': web_item_id,
                'premium_item_id': premium_item_id,
                'web_quantity': int(web_quantity),
                'premium_quantity': int(premium_quantity),
            }
        except Exception as e:
            logger.error(
                "[StripeService] ensure_per_apartment_subscription_items failed for sub=%s: %s",
                subscription_id,
                e,
                exc_info=True,
            )
            return {'ok': False, 'error': str(e)}

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

    @staticmethod
    def verify_payment_status(payment_method_id: str) -> Dict[str, Any]:
        """
        Verify payment method status with Stripe
        """
        try:
            # Check if we're in mock mode
            if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith('sk_test_') or getattr(settings, 'STRIPE_MOCK_MODE', False):
                # Mock verification for development
                logger.info(f"Mock payment verification for {payment_method_id}")
                return {
                    'verified': True,
                    'status': 'succeeded',
                    'message': 'Payment verified (mock mode)',
                    'timestamp': timezone.now().isoformat()
                }

            # Real Stripe verification for production
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)

            # Check if payment method is valid and can be used
            if payment_method and payment_method.type == 'card':
                return {
                    'verified': True,
                    'status': 'succeeded',
                    'message': 'Payment method verified',
                    'timestamp': timezone.now().isoformat(),
                    'payment_method': {
                        'id': payment_method.id,
                        'type': payment_method.type,
                        'card': {
                            'brand': payment_method.card.brand,
                            'last4': payment_method.card.last4
                        }
                    }
                }
            else:
                return {
                    'verified': False,
                    'status': 'failed',
                    'message': 'Invalid payment method',
                    'timestamp': timezone.now().isoformat()
                }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment verification error: {e}")
            return {
                'verified': False,
                'status': 'error',
                'message': f'Payment verification failed: {str(e)}',
                'timestamp': timezone.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Payment verification error: {e}")
            return {
                'verified': False,
                'status': 'error',
                'message': 'Payment verification failed',
                'timestamp': timezone.now().isoformat()
            }

    @staticmethod
    def handle_payment_intent_succeeded(payment_intent_data: Dict[str, Any]) -> bool:
        """
        Handle successful payment intent from webhook
        """
        try:
            payment_intent_id = payment_intent_data.get('id')
            customer_id = payment_intent_data.get('customer')

            logger.info(f"Processing successful payment intent: {payment_intent_id}")

            # In mock mode, just log the event
            if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith('sk_test_') or getattr(settings, 'STRIPE_MOCK_MODE', False):
                logger.info(f"Mock payment intent succeeded: {payment_intent_id}")
                return True

            # In production, you might want to update subscription status here
            # This would be handled by the webhook system

            return True

        except Exception as e:
            logger.error(f"Error handling payment intent succeeded: {e}")
            return False

    @staticmethod
    def handle_payment_intent_failed(payment_intent_data: Dict[str, Any]) -> bool:
        """
        Handle failed payment intent from webhook
        """
        try:
            payment_intent_id = payment_intent_data.get('id')
            customer_id = payment_intent_data.get('customer')

            logger.warning(f"Processing failed payment intent: {payment_intent_id}")

            # In mock mode, just log the event
            if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith('sk_test_') or getattr(settings, 'STRIPE_MOCK_MODE', False):
                logger.info(f"Mock payment intent failed: {payment_intent_id}")
                return True

            # In production, you might want to update subscription status here
            # This would be handled by the webhook system

            return True

        except Exception as e:
            logger.error(f"Error handling payment intent failed: {e}")
            return False

    @staticmethod
    def create_checkout_session(session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a Stripe Checkout Session for subscription payment
        """
        try:
            # Check if we're in mock mode
            if not settings.STRIPE_SECRET_KEY or getattr(settings, 'STRIPE_MOCK_MODE', False):
                # Create mock checkout session for development
                import uuid
                mock_session_id = f"cs_test_{uuid.uuid4().hex[:24]}"
                logger.info(f"Created mock checkout session {mock_session_id}")

                # Return mock checkout session data
                success_url = session_data.get('success_url', '')
                # Replace {CHECKOUT_SESSION_ID} placeholder with actual session ID
                if '{CHECKOUT_SESSION_ID}' in success_url:
                    success_url = success_url.replace('{CHECKOUT_SESSION_ID}', mock_session_id)
                else:
                    success_url = f"{success_url}?session_id={mock_session_id}"

                return {
                    'id': mock_session_id,
                    'url': success_url,
                    'status': 'open',
                    'mode': session_data.get('mode', 'subscription'),
                    'customer_email': session_data.get('customer_email'),
                    'client_reference_id': session_data.get('client_reference_id'),
                    'metadata': session_data.get('metadata', {}),
                    'created': int(timezone.now().timestamp())
                }

            # Create real Stripe checkout session
            checkout_session = stripe.checkout.Session.create(**session_data)

            logger.info(f"Created Stripe checkout session {checkout_session.id}")

            # Return the session as a dict
            return dict(checkout_session)

        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe checkout session: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating checkout session: {e}")
            raise


