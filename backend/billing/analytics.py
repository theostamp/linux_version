# billing/analytics.py

from django.utils import timezone
from django.db.models import Sum, Count, Avg
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Any
import logging

from .models import UserSubscription, UsageTracking, BillingCycle
from .services import BillingService

logger = logging.getLogger(__name__)


class UsageAnalyticsService:
    """
    Service για την ανάλυση usage data και generation reports
    """
    
    @staticmethod
    def get_user_usage_summary(user) -> Dict[str, Any]:
        """
        Get comprehensive usage summary για user
        """
        try:
            subscription = BillingService.get_user_subscription(user)
            if not subscription:
                return {
                    'has_subscription': False,
                    'message': 'No active subscription found'
                }
            
            # Get current month usage
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (current_month + timedelta(days=32)).replace(day=1)
            
            usage_data = UsageTracking.objects.filter(
                subscription=subscription,
                period_start__gte=current_month,
                period_end__lt=next_month
            )
            
            # Build usage summary
            summary = {
                'subscription': {
                    'id': subscription.id,
                    'plan_name': subscription.plan.name,
                    'plan_type': subscription.plan.plan_type,
                    'status': subscription.status,
                    'billing_interval': subscription.billing_interval,
                    'is_trial': subscription.is_trial,
                    'trial_end': subscription.trial_end,
                    'current_period_end': subscription.current_period_end
                },
                'usage': {},
                'limits': {},
                'utilization': {},
                'overages': {},
                'recommendations': []
            }
            
            # Process each metric
            for usage in usage_data:
                metric = usage.metric_type
                current = usage.current_value
                limit = usage.limit_value
                
                summary['usage'][metric] = current
                summary['limits'][metric] = limit
                
                # Calculate utilization percentage
                if limit > 0:
                    utilization = (current / limit) * 100
                    summary['utilization'][metric] = round(utilization, 2)
                    
                    # Check for overages
                    if current > limit:
                        summary['overages'][metric] = current - limit
                        
                        # Add recommendation
                        summary['recommendations'].append({
                            'type': 'overage',
                            'metric': metric,
                            'message': f'You have exceeded your {metric} limit by {current - limit}. Consider upgrading your plan.'
                        })
                    
                    # Add utilization warnings
                    elif utilization > 80:
                        summary['recommendations'].append({
                            'type': 'warning',
                            'metric': metric,
                            'message': f'You are using {utilization:.1f}% of your {metric} limit.'
                        })
                else:
                    summary['utilization'][metric] = 0  # Unlimited
            
            # Add plan upgrade recommendations
            if subscription.plan.plan_type == 'starter' and any(
                util > 70 for util in summary['utilization'].values() if util is not None
            ):
                summary['recommendations'].append({
                    'type': 'upgrade',
                    'message': 'Consider upgrading to Professional plan for better limits and features.'
                })
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting usage summary for user {user.email}: {e}")
            return {
                'error': 'Failed to get usage summary',
                'message': str(e)
            }
    
    @staticmethod
    def get_usage_trends(user, days: int = 30) -> Dict[str, Any]:
        """
        Get usage trends για τις τελευταίες N μέρες
        """
        try:
            subscription = BillingService.get_user_subscription(user)
            if not subscription:
                return {'error': 'No active subscription found'}
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Get usage data for the period
            usage_data = UsageTracking.objects.filter(
                subscription=subscription,
                period_start__gte=start_date,
                period_end__lte=end_date
            ).order_by('period_start', 'metric_type')
            
            # Group by metric type and date
            trends = {}
            for usage in usage_data:
                metric = usage.metric_type
                date = usage.period_start.date()
                
                if metric not in trends:
                    trends[metric] = {}
                
                trends[metric][str(date)] = usage.current_value
            
            return {
                'period': {
                    'start_date': start_date.date(),
                    'end_date': end_date.date(),
                    'days': days
                },
                'trends': trends,
                'subscription': {
                    'plan_name': subscription.plan.name,
                    'plan_type': subscription.plan.plan_type
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting usage trends for user {user.email}: {e}")
            return {'error': 'Failed to get usage trends', 'message': str(e)}
    
    @staticmethod
    def get_plan_comparison(user) -> Dict[str, Any]:
        """
        Compare current plan με άλλα available plans
        """
        try:
            subscription = BillingService.get_user_subscription(user)
            if not subscription:
                return {'error': 'No active subscription found'}
            
            current_plan = subscription.plan
            current_usage = UsageAnalyticsService.get_user_usage_summary(user)
            
            # Get all available plans
            from .models import SubscriptionPlan
            all_plans = SubscriptionPlan.objects.filter(is_active=True).order_by('monthly_price')
            
            comparison = {
                'current_plan': {
                    'name': current_plan.name,
                    'plan_type': current_plan.plan_type,
                    'monthly_price': float(current_plan.monthly_price),
                    'yearly_price': float(current_plan.yearly_price),
                    'limits': {
                        'buildings': current_plan.max_buildings,
                        'apartments': current_plan.max_apartments,
                        'users': current_plan.max_users,
                        'api_calls': current_plan.max_api_calls,
                        'storage_gb': current_plan.max_storage_gb
                    },
                    'features': {
                        'analytics': current_plan.has_analytics,
                        'custom_integrations': current_plan.has_custom_integrations,
                        'priority_support': current_plan.has_priority_support,
                        'white_label': current_plan.has_white_label
                    },
                    'current_usage': current_usage.get('usage', {})
                },
                'available_plans': [],
                'recommendations': []
            }
            
            # Add other plans
            for plan in all_plans:
                if plan.plan_type != current_plan.plan_type:
                    plan_data = {
                        'name': plan.name,
                        'plan_type': plan.plan_type,
                        'monthly_price': float(plan.monthly_price),
                        'yearly_price': float(plan.yearly_price),
                        'limits': {
                            'buildings': plan.max_buildings,
                            'apartments': plan.max_apartments,
                            'users': plan.max_users,
                            'api_calls': plan.max_api_calls,
                            'storage_gb': plan.max_storage_gb
                        },
                        'features': {
                            'analytics': plan.has_analytics,
                            'custom_integrations': plan.has_custom_integrations,
                            'priority_support': plan.has_priority_support,
                            'white_label': plan.has_white_label
                        },
                        'trial_days': plan.trial_days
                    }
                    comparison['available_plans'].append(plan_data)
            
            # Add upgrade/downgrade recommendations
            current_usage_data = current_usage.get('usage', {})
            for plan_data in comparison['available_plans']:
                if plan_data['monthly_price'] > comparison['current_plan']['monthly_price']:
                    # Upgrade recommendation
                    if any(
                        current_usage_data.get(metric, 0) > comparison['current_plan']['limits'][metric]
                        for metric in ['buildings', 'apartments', 'users', 'api_calls']
                        if comparison['current_plan']['limits'][metric] > 0
                    ):
                        comparison['recommendations'].append({
                            'type': 'upgrade',
                            'plan': plan_data['name'],
                            'reason': 'Current usage exceeds plan limits',
                            'savings': f"€{plan_data['monthly_price'] - comparison['current_plan']['monthly_price']:.2f}/month additional cost"
                        })
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error getting plan comparison for user {user.email}: {e}")
            return {'error': 'Failed to get plan comparison', 'message': str(e)}
    
    @staticmethod
    def get_billing_history(user, months: int = 6) -> Dict[str, Any]:
        """
        Get billing history για user
        """
        try:
            subscription = BillingService.get_user_subscription(user)
            if not subscription:
                return {'error': 'No active subscription found'}
            
            # Get billing cycles
            billing_cycles = BillingCycle.objects.filter(
                subscription=subscription
            ).order_by('-period_start')[:months]
            
            history = {
                'subscription': {
                    'id': subscription.id,
                    'plan_name': subscription.plan.name,
                    'plan_type': subscription.plan.plan_type
                },
                'billing_cycles': [],
                'summary': {
                    'total_paid': 0,
                    'total_due': 0,
                    'successful_payments': 0,
                    'failed_payments': 0
                }
            }
            
            for cycle in billing_cycles:
                cycle_data = {
                    'id': cycle.id,
                    'period_start': cycle.period_start,
                    'period_end': cycle.period_end,
                    'amount_due': float(cycle.amount_due),
                    'amount_paid': float(cycle.amount_paid) if cycle.amount_paid else 0,
                    'status': cycle.status,
                    'due_date': cycle.due_date,
                    'paid_at': cycle.paid_at
                }
                history['billing_cycles'].append(cycle_data)
                
                # Update summary
                history['summary']['total_due'] += float(cycle.amount_due)
                if cycle.amount_paid:
                    history['summary']['total_paid'] += float(cycle.amount_paid)
                
                if cycle.status == 'paid':
                    history['summary']['successful_payments'] += 1
                elif cycle.status == 'failed':
                    history['summary']['failed_payments'] += 1
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting billing history for user {user.email}: {e}")
            return {'error': 'Failed to get billing history', 'message': str(e)}
    
    @staticmethod
    def get_admin_usage_stats(admin_user) -> Dict[str, Any]:
        """
        Get usage statistics για admin users
        """
        try:
            # Only superusers can access admin stats
            if not admin_user.is_superuser:
                return {'error': 'Admin access required'}
            
            # Get all active subscriptions
            active_subscriptions = UserSubscription.objects.filter(
                status__in=['trial', 'active']
            ).select_related('user', 'plan')
            
            stats = {
                'total_subscriptions': active_subscriptions.count(),
                'plan_distribution': {},
                'usage_summary': {},
                'revenue_summary': {
                    'monthly_recurring_revenue': 0,
                    'yearly_recurring_revenue': 0,
                    'total_revenue': 0
                },
                'subscription_status': {
                    'active': 0,
                    'trial': 0,
                    'cancelled': 0
                }
            }
            
            # Analyze subscriptions
            for subscription in active_subscriptions:
                plan_type = subscription.plan.plan_type
                
                # Plan distribution
                stats['plan_distribution'][plan_type] = stats['plan_distribution'].get(plan_type, 0) + 1
                
                # Status distribution
                stats['subscription_status'][subscription.status] += 1
                
                # Revenue calculation
                if subscription.billing_interval == 'month':
                    stats['revenue_summary']['monthly_recurring_revenue'] += float(subscription.price)
                elif subscription.billing_interval == 'year':
                    stats['revenue_summary']['yearly_recurring_revenue'] += float(subscription.price)
                
                stats['revenue_summary']['total_revenue'] += float(subscription.price)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting admin usage stats: {e}")
            return {'error': 'Failed to get admin stats', 'message': str(e)}


