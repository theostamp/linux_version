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
from users.models import CustomUser
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
from .admin_dashboard import AdminDashboardService
from .advanced_analytics import AdvancedAnalyticsService
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
        try:
            subscription = BillingService.get_user_subscription(request.user)
            
            if not subscription:
                return Response({
                    'message': 'No active subscription found',
                    'subscription': None
                }, status=status.HTTP_200_OK)
            
            # Check if subscription has plan
            if not subscription.plan:
                logger.warning(f"Subscription {subscription.id} has no plan assigned")
                return Response({
                    'message': 'Subscription found but plan is missing',
                    'subscription': None
                }, status=status.HTTP_200_OK)
            
            serializer = UserSubscriptionSerializer(subscription)
            return Response({
                'subscription': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting current subscription for user {request.user.email}: {e}", exc_info=True)
            return Response({
                'message': 'Error retrieving subscription',
                'error': str(e),
                'subscription': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


class InvoiceManagementView(APIView):
    """
    View για invoice management
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get invoices για user
        """
        try:
            subscription = BillingService.get_user_subscription(request.user)
            if not subscription:
                return Response({
                    'error': 'No active subscription found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get billing cycles
            billing_cycles = BillingCycle.objects.filter(
                subscription=subscription
            ).order_by('-period_start')
            
            serializer = BillingCycleSerializer(billing_cycles, many=True)
            return Response({
                'invoices': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error getting invoices: {e}")
            return Response({
                'error': 'Failed to get invoices'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Generate new invoice manually (admin only)
        """
        try:
            # Only superusers can generate invoices manually
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            subscription_id = request.data.get('subscription_id')
            if not subscription_id:
                return Response({
                    'error': 'subscription_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                subscription = UserSubscription.objects.get(id=subscription_id)
            except UserSubscription.DoesNotExist:
                return Response({
                    'error': 'Subscription not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            invoice = BillingService.generate_invoice(subscription)
            if invoice:
                serializer = BillingCycleSerializer(invoice)
                return Response({
                    'message': 'Invoice generated successfully',
                    'invoice': serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Failed to generate invoice'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error generating invoice: {e}")
            return Response({
                'error': 'Failed to generate invoice'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentProcessingView(APIView):
    """
    View για payment processing
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Process payment για invoice
        """
        try:
            invoice_id = request.data.get('invoice_id')
            payment_intent_id = request.data.get('payment_intent_id')
            
            if not invoice_id or not payment_intent_id:
                return Response({
                    'error': 'invoice_id and payment_intent_id are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                billing_cycle = BillingCycle.objects.get(id=invoice_id)
            except BillingCycle.DoesNotExist:
                return Response({
                    'error': 'Invoice not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if user owns this invoice
            if billing_cycle.subscription.user != request.user:
                return Response({
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Process payment
            success = BillingService.process_payment(billing_cycle, payment_intent_id)
            
            if success:
                serializer = BillingCycleSerializer(billing_cycle)
                return Response({
                    'message': 'Payment processed successfully',
                    'invoice': serializer.data
                })
            else:
                return Response({
                    'error': 'Failed to process payment'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error processing payment: {e}")
            return Response({
                'error': 'Failed to process payment'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBillingManagementView(APIView):
    """
    View για admin billing management
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get billing overview για admin
        """
        try:
            # Only superusers can access admin billing
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get billing statistics
            total_subscriptions = UserSubscription.objects.count()
            active_subscriptions = UserSubscription.objects.filter(
                status__in=['trial', 'active']
            ).count()
            
            pending_invoices = BillingCycle.objects.filter(status='pending').count()
            paid_invoices = BillingCycle.objects.filter(status='paid').count()
            failed_invoices = BillingCycle.objects.filter(status='failed').count()
            
            # Calculate revenue
            total_revenue = sum(
                float(cycle.amount_paid) for cycle in 
                BillingCycle.objects.filter(status='paid')
                if cycle.amount_paid
            )
            
            pending_revenue = sum(
                float(cycle.amount_due) for cycle in 
                BillingCycle.objects.filter(status='pending')
            )
            
            return Response({
                'overview': {
                    'total_subscriptions': total_subscriptions,
                    'active_subscriptions': active_subscriptions,
                    'pending_invoices': pending_invoices,
                    'paid_invoices': paid_invoices,
                    'failed_invoices': failed_invoices,
                    'total_revenue': round(total_revenue, 2),
                    'pending_revenue': round(pending_revenue, 2),
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting admin billing overview: {e}")
            return Response({
                'error': 'Failed to get billing overview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Generate monthly invoices (admin only)
        """
        try:
            # Only superusers can generate monthly invoices
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            generated_count = BillingService.generate_monthly_invoices()
            
            return Response({
                'message': f'Generated {generated_count} monthly invoices',
                'generated_count': generated_count
            })
            
        except Exception as e:
            logger.error(f"Error generating monthly invoices: {e}")
            return Response({
                'error': 'Failed to generate monthly invoices'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminDashboardView(APIView):
    """
    Comprehensive admin dashboard view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get comprehensive admin dashboard data
        """
        try:
            # Only superusers can access admin dashboard
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            dashboard_type = request.query_params.get('type', 'overview')
            
            if dashboard_type == 'overview':
                data = AdminDashboardService.get_dashboard_overview()
            elif dashboard_type == 'users':
                data = AdminDashboardService.get_user_management_data()
            elif dashboard_type == 'subscriptions':
                data = AdminDashboardService.get_subscription_management_data()
            elif dashboard_type == 'financial':
                data = AdminDashboardService.get_financial_overview()
            elif dashboard_type == 'system':
                data = AdminDashboardService.get_system_health()
            else:
                return Response({
                    'error': 'Invalid dashboard type'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting admin dashboard data: {e}")
            return Response({
                'error': 'Failed to get dashboard data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserManagementView(APIView):
    """
    Admin user management view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get user management data
        """
        try:
            # Only superusers can access user management
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            data = AdminDashboardService.get_user_management_data()
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting user management data: {e}")
            return Response({
                'error': 'Failed to get user management data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Perform user management actions
        """
        try:
            # Only superusers can perform user management actions
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            action = request.data.get('action')
            user_id = request.data.get('user_id')
            
            if not action or not user_id:
                return Response({
                    'error': 'action and user_id are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if action == 'activate':
                user.is_active = True
                user.save()
                message = f'User {user.email} activated successfully'
            elif action == 'deactivate':
                user.is_active = False
                user.save()
                message = f'User {user.email} deactivated successfully'
            elif action == 'verify_email':
                user.email_verified = True
                user.save()
                message = f'Email verified for {user.email}'
            elif action == 'reset_password':
                # This would typically send a password reset email
                message = f'Password reset email sent to {user.email}'
            else:
                return Response({
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'message': message,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'is_active': user.is_active,
                    'email_verified': user.email_verified
                }
            })
            
        except Exception as e:
            logger.error(f"Error performing user management action: {e}")
            return Response({
                'error': 'Failed to perform action'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSubscriptionManagementView(APIView):
    """
    Admin subscription management view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get subscription management data
        """
        try:
            # Only superusers can access subscription management
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            data = AdminDashboardService.get_subscription_management_data()
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting subscription management data: {e}")
            return Response({
                'error': 'Failed to get subscription management data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Perform subscription management actions
        """
        try:
            # Only superusers can perform subscription management actions
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            action = request.data.get('action')
            subscription_id = request.data.get('subscription_id')
            
            if not action or not subscription_id:
                return Response({
                    'error': 'action and subscription_id are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                subscription = UserSubscription.objects.get(id=subscription_id)
            except UserSubscription.DoesNotExist:
                return Response({
                    'error': 'Subscription not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if action == 'cancel':
                success = BillingService.cancel_subscription(subscription, cancel_at_period_end=True)
                if success:
                    message = f'Subscription cancelled for {subscription.user.email}'
                else:
                    return Response({
                        'error': 'Failed to cancel subscription'
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif action == 'reactivate':
                subscription.status = 'active'
                subscription.cancel_at_period_end = False
                subscription.cancelled_at = None
                subscription.save()
                message = f'Subscription reactivated for {subscription.user.email}'
            elif action == 'extend_trial':
                days = request.data.get('days', 7)
                if subscription.trial_end:
                    subscription.trial_end = subscription.trial_end + timezone.timedelta(days=days)
                else:
                    subscription.trial_end = timezone.now() + timezone.timedelta(days=days)
                subscription.save()
                message = f'Trial extended by {days} days for {subscription.user.email}'
            else:
                return Response({
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'message': message,
                'subscription': UserSubscriptionSerializer(subscription).data
            })
            
        except Exception as e:
            logger.error(f"Error performing subscription management action: {e}")
            return Response({
                'error': 'Failed to perform action'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSystemHealthView(APIView):
    """
    Admin system health monitoring view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get system health status
        """
        try:
            # Only superusers can access system health
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            health_data = AdminDashboardService.get_system_health()
            
            if 'error' in health_data:
                return Response(health_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(health_data)
            
        except Exception as e:
            logger.error(f"Error getting system health: {e}")
            return Response({
                'error': 'Failed to get system health'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdvancedAnalyticsView(APIView):
    """
    Advanced analytics view για detailed reporting και insights
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get advanced analytics data
        """
        try:
            # Only superusers can access advanced analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            analytics_type = request.query_params.get('type', 'overview')
            period_days = int(request.query_params.get('period_days', 30))
            
            if analytics_type == 'revenue':
                data = AdvancedAnalyticsService.get_revenue_analytics(period_days)
            elif analytics_type == 'customers':
                data = AdvancedAnalyticsService.get_customer_analytics(period_days)
            elif analytics_type == 'subscriptions':
                data = AdvancedAnalyticsService.get_subscription_analytics(period_days)
            elif analytics_type == 'usage':
                data = AdvancedAnalyticsService.get_usage_analytics(period_days)
            elif analytics_type == 'payments':
                data = AdvancedAnalyticsService.get_payment_analytics(period_days)
            elif analytics_type == 'predictive':
                data = AdvancedAnalyticsService.get_predictive_analytics()
            else:
                return Response({
                    'error': 'Invalid analytics type. Available: revenue, customers, subscriptions, usage, payments, predictive'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting advanced analytics: {e}")
            return Response({
                'error': 'Failed to get advanced analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RevenueAnalyticsView(APIView):
    """
    Dedicated revenue analytics view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get detailed revenue analytics
        """
        try:
            # Only superusers can access revenue analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            period_days = int(request.query_params.get('period_days', 30))
            
            data = AdvancedAnalyticsService.get_revenue_analytics(period_days)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting revenue analytics: {e}")
            return Response({
                'error': 'Failed to get revenue analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerAnalyticsView(APIView):
    """
    Dedicated customer analytics view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get detailed customer analytics
        """
        try:
            # Only superusers can access customer analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            period_days = int(request.query_params.get('period_days', 30))
            
            data = AdvancedAnalyticsService.get_customer_analytics(period_days)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting customer analytics: {e}")
            return Response({
                'error': 'Failed to get customer analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionAnalyticsView(APIView):
    """
    Dedicated subscription analytics view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get detailed subscription analytics
        """
        try:
            # Only superusers can access subscription analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            period_days = int(request.query_params.get('period_days', 30))
            
            data = AdvancedAnalyticsService.get_subscription_analytics(period_days)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting subscription analytics: {e}")
            return Response({
                'error': 'Failed to get subscription analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsageAnalyticsView(APIView):
    """
    Dedicated usage analytics view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get detailed usage analytics
        """
        try:
            # Only superusers can access usage analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            period_days = int(request.query_params.get('period_days', 30))
            
            data = AdvancedAnalyticsService.get_usage_analytics(period_days)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {e}")
            return Response({
                'error': 'Failed to get usage analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentAnalyticsView(APIView):
    """
    Dedicated payment analytics view
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get detailed payment analytics
        """
        try:
            # Only superusers can access payment analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            period_days = int(request.query_params.get('period_days', 30))
            
            data = AdvancedAnalyticsService.get_payment_analytics(period_days)
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting payment analytics: {e}")
            return Response({
                'error': 'Failed to get payment analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PredictiveAnalyticsView(APIView):
    """
    Predictive analytics view για forecasting
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get predictive analytics και forecasting data
        """
        try:
            # Only superusers can access predictive analytics
            if not request.user.is_superuser:
                return Response({
                    'error': 'Admin access required'
                }, status=status.HTTP_403_FORBIDDEN)
            
            data = AdvancedAnalyticsService.get_predictive_analytics()
            
            if 'error' in data:
                return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(data)
            
        except Exception as e:
            logger.error(f"Error getting predictive analytics: {e}")
            return Response({
                'error': 'Failed to get predictive analytics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateCheckoutSessionView(APIView):
    """
    Creates a Stripe Checkout Session for subscription payment.
    This replaces the frontend card collection with Stripe's hosted checkout.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a Stripe Checkout Session.
        
        Expected payload:
        {
            "plan_id": 1,
            "building_name": "My Building"
        }
        """
        try:
            user = request.user
            plan_id = request.data.get('plan_id')
            building_name = request.data.get('building_name', '')
            
            if not plan_id:
                return Response({
                    'error': 'plan_id is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user already has an active subscription
            from billing.models import UserSubscription
            existing_subscription = UserSubscription.objects.filter(
                user=user,
                status__in=['active', 'trial']
            ).first()
            
            if existing_subscription:
                logger.warning(f"User {user.email} already has an active subscription. Preventing duplicate checkout.")
                return Response({
                    'error': 'You already have an active subscription',
                    'subscription_id': existing_subscription.id,
                    'status': existing_subscription.status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user already has a tenant (another safety check)
            if user.tenant:
                logger.warning(f"User {user.email} already has a tenant. Preventing duplicate checkout.")
                return Response({
                    'error': 'You already have a workspace',
                    'tenant': user.tenant.schema_name
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the subscription plan
            try:
                plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
            except SubscriptionPlan.DoesNotExist:
                return Response({
                    'error': 'Invalid subscription plan'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate unique tenant subdomain using improved naming logic
            from tenants.services import TenantService
            from tenants.utils import generate_schema_name_from_email, generate_unique_schema_name
            
            tenant_service = TenantService()
            
            if building_name:
                # Use building name if provided
                base_name = building_name
            else:
                # Use improved email-based naming (extract only prefix before @)
                base_name = generate_schema_name_from_email(user.email)
            
            tenant_subdomain = generate_unique_schema_name(base_name)
            
            # Create Stripe Checkout Session
            stripe_service = StripeService()
            
            # Determine the price ID based on plan
            price_id = plan.stripe_price_id_monthly  # Default to monthly
            
            # Validate that price ID exists
            if not price_id:
                logger.error(f"Plan {plan.id} ({plan.name}) does not have a stripe_price_id_monthly set")
                return Response({
                    'error': 'Subscription plan is not properly configured. Please contact support.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Build success and cancel URLs
            from django.conf import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            success_url = f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = f"{frontend_url}/payment/cancel"
            
            # Create the checkout session
            session_data = {
                'client_reference_id': str(user.id),
                'customer_email': user.email,
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': {
                    'user_id': str(user.id),
                    'plan_id': str(plan_id),
                    'tenant_subdomain': tenant_subdomain,
                    'building_name': building_name
                },
                'subscription_data': {
                    'metadata': {
                        'user_id': str(user.id),
                        'plan_id': str(plan_id),
                        'tenant_subdomain': tenant_subdomain
                    }
                }
            }
            
            try:
                checkout_session = stripe_service.create_checkout_session(session_data)
            except Exception as e:
                logger.error(f"Stripe checkout session creation failed: {e}", exc_info=True)
                return Response({
                    'error': f'Failed to create checkout session: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Save the checkout session ID to the user for polling
            user.stripe_checkout_session_id = checkout_session['id']
            user.save(update_fields=['stripe_checkout_session_id'])
            
            logger.info(f"Created checkout session {checkout_session['id']} for user {user.email}")
            
            return Response({
                'checkout_url': checkout_session['url'],
                'session_id': checkout_session['id'],
                'tenant_subdomain': tenant_subdomain
            })
            
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            return Response({
                'error': 'Failed to create checkout session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionStatusView(APIView):
    """
    Checks the status of a subscription setup process based on a Stripe session ID.
    Used by the frontend for polling to know when tenant creation is complete.
    """
    permission_classes = [permissions.AllowAny]  # No auth required since user hasn't logged into tenant yet
    
    def get(self, request, session_id):
        """
        Check subscription status by session ID.
        
        Returns:
        - status: 'pending' (404) - session not found or processing not started
        - status: 'processing' (200) - webhook processing in progress
        - status: 'completed' (200) - tenant created, returns subdomain and token
        - status: 'failed' (200) - processing failed
        """
        try:
            # Find user by checkout session ID
            try:
                user = CustomUser.objects.get(stripe_checkout_session_id=session_id)
            except CustomUser.DoesNotExist:
                # Session not found - could be expired, already processed, or invalid
                return Response({
                    'status': 'not_found',
                    'message': 'Session not found or expired'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if user.tenant:
                # Additional security check: Verify user has valid subscription
                from billing.models import UserSubscription
                active_subscription = UserSubscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing', 'trial']
                ).first()
                
                if not active_subscription:
                    logger.warning(f"User {user.email} has tenant but no active subscription. This might indicate a security issue.")
                    return Response({
                        'status': 'failed',
                        'message': 'Invalid subscription state'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Tenant created! Generate one-time token for cross-domain auth
                from rest_framework_simplejwt.tokens import RefreshToken
                
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                
                # Clear the session ID since we're done with it
                user.stripe_checkout_session_id = None
                user.save(update_fields=['stripe_checkout_session_id'])
                
                logger.info(f"Subscription completed for user {user.email}, tenant: {user.tenant.schema_name}")
                
                return Response({
                    'status': 'completed',
                    'subdomain': user.tenant.schema_name,
                    'access': access_token,
                    'refresh': str(refresh)
                })
            else:
                # Processing in progress
                return Response({
                    'status': 'processing'
                })
                
        except Exception as e:
            logger.error(f"Error checking subscription status: {e}")
            return Response({
                'status': 'failed',
                'message': 'An error occurred during setup'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InitializeStripePricesView(APIView):
    """
    Initialize Stripe Products and Prices for all subscription plans.
    This is a one-time setup endpoint that can be called manually.
    """
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Create Stripe prices for all plans"""
        try:
            from django.core.management import call_command
            from io import StringIO
            
            # Capture command output
            output = StringIO()
            call_command('create_stripe_prices', stdout=output)
            
            output_text = output.getvalue()
            
            # Check if successful
            if '✅ STRIPE PRICES CREATED SUCCESSFULLY!' in output_text:
                return Response({
                    'status': 'success',
                    'message': 'Stripe prices created successfully',
                    'output': output_text
                })
            else:
                return Response({
                    'status': 'partial',
                    'message': 'Some prices may have failed',
                    'output': output_text
                }, status=status.HTTP_207_MULTI_STATUS)
                
        except Exception as e:
            logger.error(f"Error initializing Stripe prices: {e}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
