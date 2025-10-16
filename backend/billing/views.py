# billing/views.py

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.http import HttpResponse
import json
import logging

from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle, 
    UsageTracking, PaymentMethod
)
from .serializers import (
    SubscriptionPlanSerializer, UserSubscriptionSerializer,
    BillingCycleSerializer, UsageTrackingSerializer,
    PaymentMethodSerializer, CreateSubscriptionSerializer,
    UpdateSubscriptionSerializer, CancelSubscriptionSerializer,
    AddPaymentMethodSerializer, SubscriptionSummarySerializer
)
from .services import BillingService, PaymentService, WebhookService
from .integrations.stripe import StripeService
from .analytics import UsageAnalyticsService
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class SubscriptionPlanViewSet(ReadOnlyModelViewSet):
    """
    ViewSet για subscription plans (μόνο read-only)
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]  # Public για να μπορούν να δουν τα plans


class UserSubscriptionViewSet(ModelViewSet):
    """
    ViewSet για user subscriptions
    """
    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Μόνο οι subscriptions του authenticated user
        """
        return UserSubscription.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """
        Λίστα subscriptions για τον user
        """
        subscriptions = self.get_queryset()
        
        if not subscriptions.exists():
            return Response({
                'message': 'No subscriptions found',
                'subscriptions': []
            })
        
        serializer = self.get_serializer(subscriptions, many=True)
        return Response({
            'subscriptions': serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        """
        Λεπτομέρειες subscription
        """
        subscription = self.get_object()
        
        # Get summary data
        summary_data = {
            'subscription': subscription,
            'billing_cycles': subscription.billing_cycles.all()[:5],
            'usage_tracking': subscription.usage_tracking.all(),
            'payment_methods': PaymentMethod.objects.filter(user=subscription.user)
        }
        
        serializer = SubscriptionSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def create_subscription(self, request):
        """
        Δημιουργία νέας subscription
        """
        serializer = CreateSubscriptionSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            try:
                plan = SubscriptionPlan.objects.get(id=serializer.validated_data['plan_id'])
                
                subscription = BillingService.create_subscription(
                    user=request.user,
                    plan=plan,
                    billing_interval=serializer.validated_data['billing_interval'],
                    payment_method_id=serializer.validated_data.get('payment_method_id')
                )
                
                if subscription:
                    response_serializer = UserSubscriptionSerializer(subscription)
                    return Response({
                        'message': 'Subscription created successfully',
                        'subscription': response_serializer.data
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'error': 'Failed to create subscription'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error creating subscription: {e}")
                return Response({
                    'error': 'Failed to create subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def update_subscription(self, request):
        """
        Ενημέρωση subscription (upgrade/downgrade)
        """
        serializer = UpdateSubscriptionSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            try:
                subscription = BillingService.get_user_subscription(request.user)
                new_plan = SubscriptionPlan.objects.get(id=serializer.validated_data['plan_id'])
                
                success = BillingService.update_subscription(subscription, new_plan)
                
                if success:
                    response_serializer = UserSubscriptionSerializer(subscription)
                    return Response({
                        'message': 'Subscription updated successfully',
                        'subscription': response_serializer.data
                    })
                else:
                    return Response({
                        'error': 'Failed to update subscription'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error updating subscription: {e}")
                return Response({
                    'error': 'Failed to update subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def cancel_subscription(self, request):
        """
        Ακύρωση subscription
        """
        serializer = CancelSubscriptionSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            try:
                subscription = BillingService.get_user_subscription(request.user)
                
                success = BillingService.cancel_subscription(
                    subscription, 
                    serializer.validated_data['cancel_at_period_end']
                )
                
                if success:
                    response_serializer = UserSubscriptionSerializer(subscription)
                    return Response({
                        'message': 'Subscription cancelled successfully',
                        'subscription': response_serializer.data
                    })
                else:
                    return Response({
                        'error': 'Failed to cancel subscription'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error cancelling subscription: {e}")
                return Response({
                    'error': 'Failed to cancel subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Τρέχουσα subscription του user
        """
        subscription = BillingService.get_user_subscription(request.user)
        
        if not subscription:
            return Response({
                'message': 'No active subscription found',
                'subscription': None
            })
        
        serializer = UserSubscriptionSerializer(subscription)
        return Response({
            'subscription': serializer.data
        })


class PaymentMethodViewSet(ModelViewSet):
    """
    ViewSet για payment methods
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Μόνο τα payment methods του authenticated user
        """
        return PaymentMethod.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Προσθήκη νέου payment method
        """
        serializer = AddPaymentMethodSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                payment_method = PaymentService.add_payment_method(
                    user=request.user,
                    payment_method_id=serializer.validated_data['payment_method_id']
                )
                
                if payment_method:
                    response_serializer = PaymentMethodSerializer(payment_method)
                    return Response({
                        'message': 'Payment method added successfully',
                        'payment_method': response_serializer.data
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        'error': 'Failed to add payment method'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Error adding payment method: {e}")
                return Response({
                    'error': 'Failed to add payment method'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """
        Ορισμός payment method ως default
        """
        payment_method = self.get_object()
        
        try:
            success = PaymentService.set_default_payment_method(payment_method)
            
            if success:
                return Response({
                    'message': 'Payment method set as default'
                })
            else:
                return Response({
                    'error': 'Failed to set default payment method'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error setting default payment method: {e}")
            return Response({
                'error': 'Failed to set default payment method'
            }, status=status.HTTP_400_BAD_REQUEST)


class UsageTrackingViewSet(ReadOnlyModelViewSet):
    """
    ViewSet για usage tracking (μόνο read-only)
    """
    serializer_class = UsageTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Usage tracking για τις subscriptions του user
        """
        user_subscriptions = UserSubscription.objects.filter(user=self.request.user)
        return UsageTracking.objects.filter(subscription__in=user_subscriptions)


class BillingCycleViewSet(ReadOnlyModelViewSet):
    """
    ViewSet για billing cycles (μόνο read-only)
    """
    serializer_class = BillingCycleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Billing cycles για τις subscriptions του user
        """
        user_subscriptions = UserSubscription.objects.filter(user=self.request.user)
        return BillingCycle.objects.filter(subscription__in=user_subscriptions)


class StripeWebhookView(APIView):
    """
    View για Stripe webhooks
    """
    permission_classes = [permissions.AllowAny]  # Stripe webhook authentication
    
    def post(self, request):
        """
        Επεξεργασία Stripe webhook
        """
        try:
            # Get Stripe signature
            signature = request.META.get('HTTP_STRIPE_SIGNATURE')
            if not signature:
                logger.error("Missing Stripe signature")
                return HttpResponse(status=400)
            
            # Verify webhook signature
            payload = request.body
            if not StripeService.verify_webhook_signature(payload, signature):
                logger.error("Invalid Stripe signature")
                return HttpResponse(status=400)
            
            # Parse event
            event_data = json.loads(payload)
            event_type = event_data.get('type')
            
            if not event_type:
                logger.error("Missing event type")
                return HttpResponse(status=400)
            
            # Handle webhook
            success = WebhookService.handle_webhook(event_type, event_data.get('data', {}))
            
            if success:
                return HttpResponse(status=200)
            else:
                logger.error(f"Failed to handle webhook event: {event_type}")
                return HttpResponse(status=500)
                
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
            return HttpResponse(status=500)


class CreatePaymentIntentView(APIView):
    """
    View για δημιουργία payment intent
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Δημιουργία payment intent για one-time payments
        """
        try:
            amount = request.data.get('amount')
            currency = request.data.get('currency', 'eur')
            
            if not amount:
                return Response({
                    'error': 'Amount is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                amount_decimal = float(amount)
            except ValueError:
                return Response({
                    'error': 'Invalid amount format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create payment intent
            customer_id = request.user.stripe_customer_id
            payment_intent = StripeService.create_payment_intent(
                amount=amount_decimal,
                currency=currency,
                customer_id=customer_id
            )
            
            if payment_intent:
                return Response({
                    'client_secret': payment_intent['client_secret'],
                    'payment_intent_id': payment_intent['id']
                })
            else:
                return Response({
                    'error': 'Failed to create payment intent'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            return Response({
                'error': 'Failed to create payment intent'
            }, status=status.HTTP_400_BAD_REQUEST)


class UsageAnalyticsView(APIView):
    """
    View για usage analytics και reporting
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get comprehensive usage summary για user
        """
        try:
            summary = UsageAnalyticsService.get_user_usage_summary(request.user)
            
            if 'error' in summary:
                return Response(summary, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(summary)
            
        except Exception as e:
            logger.error(f"Error getting usage summary: {e}")
            return Response({
                'error': 'Failed to get usage summary'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsageTrendsView(APIView):
    """
    View για usage trends και historical data
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get usage trends για τις τελευταίες N μέρες
        """
        try:
            days = request.query_params.get('days', 30)
            try:
                days = int(days)
                if days < 1 or days > 365:
                    days = 30
            except ValueError:
                days = 30
            
            trends = UsageAnalyticsService.get_usage_trends(request.user, days)
            
            if 'error' in trends:
                return Response(trends, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(trends)
            
        except Exception as e:
            logger.error(f"Error getting usage trends: {e}")
            return Response({
                'error': 'Failed to get usage trends'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PlanComparisonView(APIView):
    """
    View για plan comparison και upgrade recommendations
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Compare current plan με άλλα available plans
        """
        try:
            comparison = UsageAnalyticsService.get_plan_comparison(request.user)
            
            if 'error' in comparison:
                return Response(comparison, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(comparison)
            
        except Exception as e:
            logger.error(f"Error getting plan comparison: {e}")
            return Response({
                'error': 'Failed to get plan comparison'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BillingHistoryView(APIView):
    """
    View για billing history και payment records
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get billing history για user
        """
        try:
            months = request.query_params.get('months', 6)
            try:
                months = int(months)
                if months < 1 or months > 24:
                    months = 6
            except ValueError:
                months = 6
            
            history = UsageAnalyticsService.get_billing_history(request.user, months)
            
            if 'error' in history:
                return Response(history, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(history)
            
        except Exception as e:
            logger.error(f"Error getting billing history: {e}")
            return Response({
                'error': 'Failed to get billing history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUsageStatsView(APIView):
    """
    View για admin usage statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get usage statistics για admin users
        """
        try:
            # Only superusers can access admin stats
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            stats = UsageAnalyticsService.get_admin_usage_stats(request.user)
            
            if 'error' in stats:
                return Response(stats, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Error getting admin usage stats: {e}")
            return Response({
                'error': 'Failed to get admin usage stats'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
