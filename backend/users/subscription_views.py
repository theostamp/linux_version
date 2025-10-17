# users/subscription_views.py

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import logging

from ..billing.models import UserSubscription, SubscriptionPlan, BillingCycle, UsageTracking
from ..core.permissions import IsAuthenticated
from ..billing.services import BillingService

User = get_user_model()
logger = logging.getLogger(__name__)


class UserCurrentSubscriptionView(APIView):
    """
    Get current user subscription
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get current user's subscription
        """
        try:
            user = request.user
            
            # Get current active subscription
            subscription = UserSubscription.objects.filter(
                user=user,
                status__in=['trial', 'active']
            ).select_related('plan').first()
            
            if not subscription:
                return Response({
                    'message': 'No active subscription found',
                    'subscription': None
                })
            
            # Get usage statistics
            usage_stats = self._get_user_usage_stats(subscription)
            
            # Get usage limits
            usage_limits = {
                'buildings': subscription.plan.max_buildings,
                'apartments': subscription.plan.max_apartments,
                'users': subscription.plan.max_users,
            }
            
            subscription_data = {
                'id': str(subscription.id),
                'plan': {
                    'id': subscription.plan.id,
                    'name': subscription.plan.name,
                    'plan_type': subscription.plan.plan_type,
                    'description': subscription.plan.description,
                    'monthly_price': float(subscription.plan.monthly_price),
                    'yearly_price': float(subscription.plan.yearly_price),
                    'features': subscription.plan.features if hasattr(subscription.plan, 'features') else [],
                },
                'status': subscription.status,
                'billing_interval': subscription.billing_interval,
                'trial_start': subscription.trial_start,
                'trial_end': subscription.trial_end,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'price': float(subscription.price),
                'currency': subscription.currency,
                'created_at': subscription.created_at,
                'days_until_renewal': subscription.days_until_renewal,
                'usage': usage_stats,
                'usage_limits': usage_limits,
            }
            
            return Response({
                'subscription': subscription_data
            })
            
        except Exception as e:
            logger.error(f"Error getting user subscription: {e}")
            return Response({
                'error': 'Failed to get subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_user_usage_stats(self, subscription):
        """
        Get user usage statistics
        """
        try:
            # Get current month usage
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (current_month + timedelta(days=32)).replace(day=1)
            
            usage_records = UsageTracking.objects.filter(
                subscription=subscription,
                period_start__gte=current_month,
                period_end__lt=next_month
            )
            
            usage_stats = {
                'buildings': 0,
                'apartments': 0,
                'users': 0,
            }
            
            for record in usage_records:
                if record.metric_type == 'buildings':
                    usage_stats['buildings'] = record.usage_count
                elif record.metric_type == 'apartments':
                    usage_stats['apartments'] = record.usage_count
                elif record.metric_type == 'users':
                    usage_stats['users'] = record.usage_count
            
            return usage_stats
            
        except Exception as e:
            logger.error(f"Error getting usage stats: {e}")
            return {'buildings': 0, 'apartments': 0, 'users': 0}


class UserSubscriptionPlansView(APIView):
    """
    Get available subscription plans
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get available subscription plans
        """
        try:
            plans = SubscriptionPlan.objects.filter(is_active=True).order_by('monthly_price')
            
            plans_data = []
            for plan in plans:
                plans_data.append({
                    'id': plan.id,
                    'name': plan.name,
                    'plan_type': plan.plan_type,
                    'description': plan.description,
                    'monthly_price': float(plan.monthly_price),
                    'yearly_price': float(plan.yearly_price),
                    'max_buildings': plan.max_buildings,
                    'max_apartments': plan.max_apartments,
                    'max_users': plan.max_users,
                    'max_api_calls': plan.max_api_calls,
                    'max_storage_gb': plan.max_storage_gb,
                    'features': {
                        'has_analytics': plan.has_analytics,
                        'has_custom_integrations': plan.has_custom_integrations,
                        'has_priority_support': plan.has_priority_support,
                        'has_white_label': plan.has_white_label,
                    },
                    'trial_days': plan.trial_days,
                    'yearly_discount_percentage': plan.yearly_discount_percentage,
                })
            
            return Response({
                'plans': plans_data
            })
            
        except Exception as e:
            logger.error(f"Error getting subscription plans: {e}")
            return Response({
                'error': 'Failed to get subscription plans'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserSubscriptionBillingHistoryView(APIView):
    """
    Get user's billing history
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get user's billing history
        """
        try:
            user = request.user
            
            # Get user's subscriptions
            subscriptions = UserSubscription.objects.filter(user=user)
            
            if not subscriptions.exists():
                return Response({
                    'billing_cycles': [],
                    'total': 0
                })
            
            # Get billing cycles
            billing_cycles = BillingCycle.objects.filter(
                subscription__in=subscriptions
            ).select_related('subscription', 'subscription__plan').order_by('-period_start')
            
            # Apply limit
            limit = int(request.query_params.get('limit', 10))
            billing_cycles = billing_cycles[:limit]
            
            cycles_data = []
            for cycle in billing_cycles:
                cycles_data.append({
                    'id': str(cycle.id),
                    'subscription_id': str(cycle.subscription.id),
                    'plan_name': cycle.subscription.plan.name,
                    'period_start': cycle.period_start,
                    'period_end': cycle.period_end,
                    'subtotal': float(cycle.subtotal),
                    'tax_amount': float(cycle.tax_amount),
                    'total_amount': float(cycle.total_amount),
                    'status': cycle.status,
                    'paid_at': cycle.paid_at,
                    'due_date': cycle.due_date,
                    'stripe_invoice_id': cycle.stripe_invoice_id,
                })
            
            return Response({
                'billing_cycles': cycles_data,
                'total': len(cycles_data)
            })
            
        except Exception as e:
            logger.error(f"Error getting billing history: {e}")
            return Response({
                'error': 'Failed to get billing history'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserSubscriptionActionsView(APIView):
    """
    User subscription actions (cancel, upgrade, etc.)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Perform subscription action
        """
        try:
            user = request.user
            action = request.data.get('action')
            
            if not action:
                return Response({
                    'error': 'Action is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user's current subscription
            subscription = UserSubscription.objects.filter(
                user=user,
                status__in=['trial', 'active']
            ).first()
            
            if not subscription:
                return Response({
                    'error': 'No active subscription found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if action == 'cancel':
                return self._cancel_subscription(subscription)
            elif action == 'reactivate':
                return self._reactivate_subscription(subscription)
            elif action == 'upgrade':
                return self._upgrade_subscription(subscription, request.data)
            else:
                return Response({
                    'error': 'Invalid action'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error performing subscription action: {e}")
            return Response({
                'error': 'Failed to perform action'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _cancel_subscription(self, subscription):
        """
        Cancel subscription
        """
        try:
            success = BillingService.cancel_subscription(subscription, cancel_at_period_end=True)
            
            if success:
                logger.info(f"Subscription {subscription.id} cancelled by user {subscription.user.email}")
                return Response({
                    'message': 'Subscription cancelled successfully. You will retain access until the end of your current billing period.'
                })
            else:
                return Response({
                    'error': 'Failed to cancel subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error cancelling subscription: {e}")
            return Response({
                'error': 'Failed to cancel subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _reactivate_subscription(self, subscription):
        """
        Reactivate cancelled subscription
        """
        try:
            subscription.status = 'active'
            subscription.canceled_at = None
            subscription.save()
            
            logger.info(f"Subscription {subscription.id} reactivated by user {subscription.user.email}")
            
            return Response({
                'message': 'Subscription reactivated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error reactivating subscription: {e}")
            return Response({
                'error': 'Failed to reactivate subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _upgrade_subscription(self, subscription, data):
        """
        Upgrade subscription plan
        """
        try:
            new_plan_id = data.get('plan_id')
            
            if not new_plan_id:
                return Response({
                    'error': 'Plan ID is required for upgrade'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            new_plan = get_object_or_404(SubscriptionPlan, id=new_plan_id)
            
            # Check if it's actually an upgrade
            if new_plan.monthly_price <= subscription.plan.monthly_price:
                return Response({
                    'error': 'Selected plan is not an upgrade'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update subscription
            success = BillingService.update_subscription(subscription, new_plan)
            
            if success:
                logger.info(f"Subscription {subscription.id} upgraded to {new_plan.name} by user {subscription.user.email}")
                return Response({
                    'message': f'Subscription upgraded to {new_plan.name} successfully'
                })
            else:
                return Response({
                    'error': 'Failed to upgrade subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error upgrading subscription: {e}")
            return Response({
                'error': 'Failed to upgrade subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserCreateSubscriptionView(APIView):
    """
    Create new subscription
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create new subscription
        """
        try:
            user = request.user
            plan_id = request.data.get('plan_id')
            billing_interval = request.data.get('billing_interval', 'month')
            payment_method_id = request.data.get('payment_method_id')
            
            if not plan_id:
                return Response({
                    'error': 'Plan ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user already has an active subscription
            existing_subscription = UserSubscription.objects.filter(
                user=user,
                status__in=['trial', 'active']
            ).first()
            
            if existing_subscription:
                return Response({
                    'error': 'You already have an active subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get plan
            plan = get_object_or_404(SubscriptionPlan, id=plan_id, is_active=True)
            
            # Create subscription
            subscription = BillingService.create_subscription(
                user=user,
                plan=plan,
                billing_interval=billing_interval,
                payment_method_id=payment_method_id
            )
            
            if subscription:
                logger.info(f"New subscription {subscription.id} created for user {user.email}")
                
                subscription_data = {
                    'id': str(subscription.id),
                    'plan_name': subscription.plan.name,
                    'status': subscription.status,
                    'billing_interval': subscription.billing_interval,
                    'price': float(subscription.price),
                    'currency': subscription.currency,
                    'trial_end': subscription.trial_end,
                    'current_period_end': subscription.current_period_end,
                }
                
                return Response({
                    'message': 'Subscription created successfully',
                    'subscription': subscription_data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Failed to create subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return Response({
                'error': 'Failed to create subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
