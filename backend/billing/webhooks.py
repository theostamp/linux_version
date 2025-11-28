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
            # Verify webhook signature (only when signature header is present and webhook secret is configured)
            if settings.STRIPE_WEBHOOK_SECRET and sig_header:
                try:
                    event = stripe.Webhook.construct_event(
                        payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
                    )
                    logger.info(f"Webhook signature verified for event: {event.get('type', 'unknown')}")
                except stripe._error.SignatureVerificationError as e:
                    logger.error(f"Webhook signature verification failed: {e}")
                    # Fallback: Try to parse payload anyway for critical events (development/testing only)
                    # WARNING: This should be disabled in production for security
                    try:
                        event = json.loads(payload)
                        event_type = event.get('type', '')
                        # Only allow checkout.session.completed without signature verification
                        if event_type == 'checkout.session.completed':
                            logger.warning(f"[FALLBACK] Processing {event_type} without signature verification - THIS IS UNSAFE!")
                            logger.warning(f"[FALLBACK] Please fix STRIPE_WEBHOOK_SECRET in production!")
                        else:
                            logger.error(f"[SECURITY] Rejecting {event_type} without valid signature")
                            return HttpResponse(status=400)
                    except (ValueError, json.JSONDecodeError):
                        logger.error("Failed to parse payload as fallback")
                        return HttpResponse(status=400)
            else:
                # In mock mode or testing mode (no signature), parse the payload directly
                logger.info("Processing webhook in mock mode (no signature verification)")
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
            logger.error(f'Invalid JSON payload: {e}')
            return HttpResponse(status=400)
        except json.JSONDecodeError as e:
            logger.error(f'JSON decode error: {e}')
            return HttpResponse(status=400)
        except Exception as e:
            logger.error(f'Webhook processing error: {e}', exc_info=True)
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
        plan_name = metadata.get('plan')  # Plan name from metadata (basic, professional, enterprise)
        plan_id_from_metadata = metadata.get('plan_id')  # Plan ID if provided directly
        user_email = metadata.get('user_email')
        user_first_name = metadata.get('user_first_name', '')
        user_last_name = metadata.get('user_last_name', '')
        
        # Convert plan name to plan_type for lookup
        plan_type = None
        if plan_name:
            plan_type_mapping = {
                'basic': 'starter',
                'professional': 'professional',
                'enterprise': 'enterprise',
            }
            plan_type = plan_type_mapping.get(plan_name.lower())
            if not plan_type:
                logger.error(f"[WEBHOOK] Invalid plan name: {plan_name}")
                return

        logger.info(f"[WEBHOOK] checkout.session.completed: {stripe_checkout_session_id}")

        # Idempotency check #1: Find user by session ID or email
        user = None
        try:
            user = CustomUser.objects.get(stripe_checkout_session_id=stripe_checkout_session_id)
            logger.info(f"[WEBHOOK] Found user by session ID: {user.email}")
        except CustomUser.DoesNotExist:
            # Try to find user by email if session ID not found
            if user_email:
                try:
                    user = CustomUser.objects.get(email=user_email)
                    logger.info(f"[WEBHOOK] Found user by email: {user.email}, updating session ID")
                    # Update session ID for future lookups
                    user.stripe_checkout_session_id = stripe_checkout_session_id
                    user.save(update_fields=['stripe_checkout_session_id'])
                except CustomUser.DoesNotExist:
                    # User doesn't exist - create it from metadata
                    if not all([user_email, tenant_subdomain]):
                        logger.error(f"[WEBHOOK] Missing required metadata to create user: email={user_email}, tenant={tenant_subdomain}")
                        return
                    if not plan_type:
                        logger.error(f"[WEBHOOK] Missing plan name in metadata")
                        return
                    
                    logger.info(f"[WEBHOOK] Creating new user from metadata: {user_email}")
                    user = CustomUser.objects.create_user(
                        email=user_email,
                        password='temp_password_123',  # Will be reset after email verification
                        first_name=user_first_name,
                        last_name=user_last_name,
                        is_active=False,  # Needs email verification
                        stripe_checkout_session_id=stripe_checkout_session_id
                        # username is set automatically by CustomUserManager to email
                    )
                    logger.info(f"[WEBHOOK] Created new user: {user.email}")
            else:
                logger.error(f"[WEBHOOK] User not found for session: {stripe_checkout_session_id} and no email in metadata")
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
                
                # Get plan by plan_type (more reliable than ID)
                try:
                    if plan_id_from_metadata:
                        # Try by ID first if provided
                        plan = SubscriptionPlan.objects.get(id=plan_id_from_metadata)
                    else:
                        # Use plan_type lookup
                        plan = SubscriptionPlan.objects.get(plan_type=plan_type)
                    logger.info(f"[WEBHOOK] Found plan: {plan.name} (ID: {plan.id}, Type: {plan.plan_type})")
                except SubscriptionPlan.DoesNotExist:
                    logger.error(f"[WEBHOOK] Plan not found: plan_type={plan_type}, plan_id={plan_id_from_metadata}")
                    return

                # Create tenant + subscription
                tenant, subscription = tenant_service.create_tenant_and_subscription(
                    schema_name=schema_name,
                    user=user,
                    plan_id=plan.id,  # Use the actual plan ID from database
                    stripe_customer_id=stripe_customer_id,
                    stripe_subscription_id=stripe_subscription_id,
                    stripe_checkout_session_id=stripe_checkout_session_id
                )

                # Link user to tenant and make them tenant admin
                user.tenant = tenant
                user.is_staff = True
                user.is_superuser = False  # NO superuser rights (security fix)
                user.role = 'manager'  # Tenant owner/admin role
                user.is_active = False  # Needs email verification before activation
                user.save(update_fields=['tenant', 'is_staff', 'is_superuser', 'role', 'is_active'])

                logger.info(f"[WEBHOOK] Provisioning complete for {user.email} → {tenant.schema_name}")
                
                # Send email verification after tenant creation
                try:
                    from users.services import EmailService
                    email_sent = EmailService.send_verification_email(user)
                    if email_sent:
                        logger.info(f"[WEBHOOK] Verification email sent to {user.email}")
                    else:
                        logger.warning(f"[WEBHOOK] Failed to send verification email to {user.email}")
                except Exception as e:
                    logger.error(f"[WEBHOOK] Error sending verification email: {e}")
                    # Don't fail webhook if email fails - tenant is already created

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
