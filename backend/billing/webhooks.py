import stripe
import json
import logging
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django_tenants.utils import schema_context

from .models import UserSubscription
from .integrations.stripe import StripeService
from users.models import CustomUser
from tenants.services import TenantService

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events for payment verification
    """
    
    def post(self, request):
        """
        Process Stripe webhook events
        """
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            # Verify webhook signature (only in production and when signature header is present)
            if not settings.STRIPE_MOCK_MODE and settings.STRIPE_WEBHOOK_SECRET and sig_header:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
                )
            else:
                # In mock mode or testing mode (no signature), parse the payload directly
                event = json.loads(payload)
            
            # Handle the event
            if event['type'] == 'checkout.session.completed':
                self.handle_checkout_session_completed(event['data']['object'])
            elif event['type'] == 'payment_intent.succeeded':
                self.handle_payment_intent_succeeded(event['data']['object'])
            elif event['type'] == 'payment_intent.payment_failed':
                self.handle_payment_intent_failed(event['data']['object'])
            elif event['type'] == 'customer.subscription.created':
                self.handle_subscription_created(event['data']['object'])
            elif event['type'] == 'customer.subscription.updated':
                self.handle_subscription_updated(event['data']['object'])
            elif event['type'] == 'customer.subscription.deleted':
                self.handle_subscription_deleted(event['data']['object'])
            else:
                logger.info(f'Unhandled event type: {event["type"]}')
            
            return HttpResponse(status=200)
            
        except ValueError as e:
            logger.error(f'Invalid payload: {e}')
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError as e:
            logger.error(f'Invalid signature: {e}')
            return HttpResponse(status=400)
        except Exception as e:
            logger.error(f'Webhook error: {e}')
            return HttpResponse(status=500)

    def handle_checkout_session_completed(self, session):
        """
        Idempotent webhook handler - uses stripe_checkout_session_id as idempotency key.
        """
        from tenants.services import TenantService
        from billing.models import UserSubscription, SubscriptionPlan
        
        stripe_checkout_session_id = session.get('id')
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')
        metadata = session.get('metadata', {})
        tenant_subdomain = metadata.get('tenant_subdomain')
        plan_id = metadata.get('plan_id')

        logger.info(f"[WEBHOOK] checkout.session.completed: {stripe_checkout_session_id}")

        # Idempotency check #1: Find user by session ID
        try:
            user = CustomUser.objects.get(stripe_checkout_session_id=stripe_checkout_session_id)
        except CustomUser.DoesNotExist:
            logger.error(f"[WEBHOOK] User not found for session: {stripe_checkout_session_id}")
            return

        # Idempotency check #2: If tenant already exists, skip
        if user.tenant:
            logger.info(f"[WEBHOOK] Tenant already exists for {user.email}: {user.tenant.schema_name}")
            return

        # Idempotency check #3: If subscription already exists, skip provisioning
        existing_subscription = UserSubscription.objects.filter(
            stripe_checkout_session_id=stripe_checkout_session_id
        ).first()
        
        if existing_subscription and existing_subscription.status in ['active', 'trial']:
            logger.info(f"[WEBHOOK] Subscription already processed for session: {stripe_checkout_session_id}")
            return

        # Provisioning με transaction
        try:
            with transaction.atomic():
                # Δημιουργία tenant infrastructure
                tenant_service = TenantService()
                schema_name = tenant_subdomain or tenant_service.generate_unique_schema_name(
                    user.email.split('@')[0]
                )
                
                # Get plan
                try:
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                except SubscriptionPlan.DoesNotExist:
                    logger.error(f"[WEBHOOK] Plan {plan_id} not found")
                    return

                # Create tenant + subscription
                tenant, subscription = tenant_service.create_tenant_and_subscription(
                    schema_name=schema_name,
                    user=user,
                    plan_id=plan_id,
                    stripe_customer_id=stripe_customer_id,
                    stripe_subscription_id=stripe_subscription_id,
                    stripe_checkout_session_id=stripe_checkout_session_id
                )

                # Link user to tenant
                user.tenant = tenant
                user.is_staff = True
                user.role = 'manager'
                user.save(update_fields=['tenant', 'is_staff', 'role'])

                logger.info(f"[WEBHOOK] Provisioning complete for {user.email} → {tenant.schema_name}")

        except Exception as e:
            logger.error(f"[WEBHOOK] Provisioning failed: {e}", exc_info=True)
            # Webhook θα retry αυτόματα από Stripe
    
    def handle_payment_intent_succeeded(self, payment_intent):
        """
        Handle successful payment intent
        """
        logger.info(f'Payment succeeded: {payment_intent["id"]}')
        
        # Update subscription status if payment was successful
        try:
            # Find subscription by payment intent ID or customer ID
            customer_id = payment_intent.get('customer')
            if customer_id:
                subscription = UserSubscription.objects.filter(
                    stripe_customer_id=customer_id,
                    status='pending'
                ).first()
                
                if subscription:
                    subscription.status = 'active'
                    subscription.save()
                    logger.info(f'Updated subscription {subscription.id} to active')
        except Exception as e:
            logger.error(f'Error updating subscription: {e}')
    
    def handle_payment_intent_failed(self, payment_intent):
        """
        Handle failed payment intent
        """
        logger.warning(f'Payment failed: {payment_intent["id"]}')
        
        # Update subscription status if payment failed
        try:
            customer_id = payment_intent.get('customer')
            if customer_id:
                subscription = UserSubscription.objects.filter(
                    stripe_customer_id=customer_id,
                    status='pending'
                ).first()
                
                if subscription:
                    subscription.status = 'failed'
                    subscription.save()
                    logger.info(f'Updated subscription {subscription.id} to failed')
        except Exception as e:
            logger.error(f'Error updating subscription: {e}')
    
    def handle_subscription_created(self, subscription_data):
        """
        Handle subscription created event
        """
        logger.info(f'Subscription created: {subscription_data["id"]}')
        # This is handled by our subscription creation flow
    
    def handle_subscription_updated(self, subscription_data):
        """
        Handle subscription updated event
        """
        logger.info(f'Subscription updated: {subscription_data["id"]}')
        
        try:
            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=subscription_data['id']
            ).first()
            
            if subscription:
                # Update subscription status based on Stripe status
                stripe_status = subscription_data['status']
                if stripe_status == 'active':
                    subscription.status = 'active'
                elif stripe_status == 'canceled':
                    subscription.status = 'canceled'
                elif stripe_status == 'past_due':
                    subscription.status = 'past_due'
                
                subscription.save()
                logger.info(f'Updated subscription {subscription.id} status to {stripe_status}')
        except Exception as e:
            logger.error(f'Error updating subscription: {e}')
    
    def handle_subscription_deleted(self, subscription_data):
        """
        Handle subscription deleted event
        """
        logger.info(f'Subscription deleted: {subscription_data["id"]}')
        
        try:
            subscription = UserSubscription.objects.filter(
                stripe_subscription_id=subscription_data['id']
            ).first()
            
            if subscription:
                subscription.status = 'canceled'
                subscription.save()
                logger.info(f'Updated subscription {subscription.id} to canceled')
        except Exception as e:
            logger.error(f'Error updating subscription: {e}')


class PaymentVerificationView(APIView):
    """
    Verify payment status for subscription creation
    """
    
    def post(self, request):
        """
        Verify payment method and return status
        """
        try:
            payment_method_id = request.data.get('payment_method_id')
            
            if not payment_method_id:
                return Response({
                    'error': 'Payment method ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify payment with Stripe
            verification_result = StripeService.verify_payment_status(payment_method_id)
            
            return Response({
                'verified': verification_result['verified'],
                'status': verification_result['status'],
                'message': verification_result['message'],
                'timestamp': verification_result['timestamp']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'Payment verification error: {e}')
            return Response({
                'error': 'Payment verification failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
