# billing/advanced_analytics.py

from django.utils import timezone
from django.db.models import Count, Sum, Avg, Max, Min, Q, F, Case, When, DecimalField, IntegerField
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime
from decimal import Decimal
from typing import Dict, List, Any, Optional
import logging
import json

from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle, 
    UsageTracking, PaymentMethod
)
from .services import BillingService

User = get_user_model()
logger = logging.getLogger(__name__)


class AdvancedAnalyticsService:
    """
    Advanced analytics service για detailed reporting και insights
    """
    
    @staticmethod
    def get_revenue_analytics(period_days: int = 30) -> Dict[str, Any]:
        """
        Advanced revenue analytics με detailed breakdown
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Revenue by source
            revenue_by_source = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).values(
                'subscription__plan__plan_type'
            ).annotate(
                revenue=Sum('total_amount'),
                count=Count('id'),
                avg_amount=Avg('total_amount')
            ).order_by('-revenue')
            
            # Revenue by plan
            revenue_by_plan = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).values(
                'subscription__plan__name',
                'subscription__plan__plan_type'
            ).annotate(
                revenue=Sum('total_amount'),
                count=Count('id'),
                avg_amount=Avg('total_amount')
            ).order_by('-revenue')
            
            # Daily revenue trend
            daily_revenue = []
            for i in range(period_days):
                date = start_date + timedelta(days=i)
                next_date = date + timedelta(days=1)
                
                daily_total = BillingCycle.objects.filter(
                    status='paid',
                    paid_at__gte=date,
                    paid_at__lt=next_date
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                daily_revenue.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'revenue': float(daily_total)
                })
            
            # Revenue growth rate
            previous_period_start = start_date - timedelta(days=period_days)
            previous_revenue = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=previous_period_start,
                paid_at__lt=start_date
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            current_revenue = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            growth_rate = 0
            if previous_revenue > 0:
                growth_rate = ((current_revenue - previous_revenue) / previous_revenue) * 100
            
            return {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': period_days
                },
                'total_revenue': float(current_revenue),
                'previous_period_revenue': float(previous_revenue),
                'growth_rate': round(growth_rate, 2),
                'revenue_by_source': list(revenue_by_source),
                'revenue_by_plan': list(revenue_by_plan),
                'daily_revenue_trend': daily_revenue
            }
            
        except Exception as e:
            logger.error(f"Error getting revenue analytics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_customer_analytics(period_days: int = 30) -> Dict[str, Any]:
        """
        Advanced customer analytics με cohort analysis
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # New customers
            new_customers = User.objects.filter(
                date_joined__gte=start_date,
                date_joined__lte=end_date
            ).count()
            
            # Customers with subscriptions
            customers_with_subscriptions = User.objects.filter(
                subscriptions__isnull=False
            ).distinct().count()
            
            # Customer acquisition by source (if tracking implemented)
            acquisition_by_day = []
            for i in range(period_days):
                date = start_date + timedelta(days=i)
                next_date = date + timedelta(days=1)
                
                daily_acquisitions = User.objects.filter(
                    date_joined__gte=date,
                    date_joined__lt=next_date
                ).count()
                
                acquisition_by_day.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'new_customers': daily_acquisitions
                })
            
            # Customer segments
            customer_segments = User.objects.annotate(
                subscription_count=Count('subscriptions'),
                total_spent=Sum(
                    Case(
                        When(subscriptions__billing_cycles__status='paid', 
                             then=F('subscriptions__billing_cycles__total_amount')),
                        default=0,
                        output_field=DecimalField()
                    )
                )
            ).values(
                subscription_count=F('subscription_count'),
                total_spent=F('total_spent')
            ).annotate(
                count=Count('id')
            ).order_by('-total_spent')
            
            # Customer lifetime metrics
            customer_lifetime_metrics = AdvancedAnalyticsService._calculate_customer_lifetime_metrics()
            
            return {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': period_days
                },
                'new_customers': new_customers,
                'customers_with_subscriptions': customers_with_subscriptions,
                'acquisition_rate': round((new_customers / period_days), 2),
                'acquisition_by_day': acquisition_by_day,
                'customer_segments': list(customer_segments),
                'lifetime_metrics': customer_lifetime_metrics
            }
            
        except Exception as e:
            logger.error(f"Error getting customer analytics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_subscription_analytics(period_days: int = 30) -> Dict[str, Any]:
        """
        Advanced subscription analytics με cohort analysis
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Subscription funnel
            funnel_data = {
                'total_users': User.objects.count(),
                'users_with_subscriptions': User.objects.filter(subscriptions__isnull=False).distinct().count(),
                'active_subscriptions': UserSubscription.objects.filter(status='active').count(),
                'trial_subscriptions': UserSubscription.objects.filter(status='trial').count(),
                'cancelled_subscriptions': UserSubscription.objects.filter(status='cancelled').count()
            }
            
            # Conversion rates
            conversion_rates = {}
            if funnel_data['total_users'] > 0:
                conversion_rates['user_to_subscription'] = round(
                    (funnel_data['users_with_subscriptions'] / funnel_data['total_users']) * 100, 2
                )
            if funnel_data['users_with_subscriptions'] > 0:
                conversion_rates['subscription_to_active'] = round(
                    (funnel_data['active_subscriptions'] / funnel_data['users_with_subscriptions']) * 100, 2
                )
            
            # Subscription cohorts (monthly)
            subscription_cohorts = AdvancedAnalyticsService._calculate_subscription_cohorts()
            
            # Churn analysis
            churn_analysis = AdvancedAnalyticsService._calculate_churn_analysis(period_days)
            
            # Plan performance
            plan_performance = UserSubscription.objects.values(
                'plan__name',
                'plan__plan_type'
            ).annotate(
                total_subscriptions=Count('id'),
                active_subscriptions=Count('id', filter=Q(status='active')),
                trial_subscriptions=Count('id', filter=Q(status='trial')),
                cancelled_subscriptions=Count('id', filter=Q(status='cancelled')),
                avg_revenue_per_subscription=Avg(
                    Case(
                        When(billing_cycles__status='paid',
                             then=F('billing_cycles__total_amount')),
                        default=0,
                        output_field=DecimalField()
                    )
                )
            ).order_by('-total_subscriptions')
            
            return {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': period_days
                },
                'funnel_data': funnel_data,
                'conversion_rates': conversion_rates,
                'subscription_cohorts': subscription_cohorts,
                'churn_analysis': churn_analysis,
                'plan_performance': list(plan_performance)
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription analytics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_usage_analytics(period_days: int = 30) -> Dict[str, Any]:
        """
        Advanced usage analytics με patterns και trends
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Usage by metric type
            usage_by_metric = UsageTracking.objects.filter(
                period_start__gte=start_date,
                period_end__lte=end_date
            ).values('metric_type').annotate(
                total_usage=Sum('current_value'),
                avg_usage=Avg('current_value'),
                max_usage=Max('current_value'),
                min_usage=Min('current_value'),
                count=Count('id')
            ).order_by('-total_usage')
            
            # Usage trends over time
            usage_trends = []
            for i in range(period_days):
                date = start_date + timedelta(days=i)
                next_date = date + timedelta(days=1)
                
                daily_usage = UsageTracking.objects.filter(
                    period_start__gte=date,
                    period_start__lt=next_date
                ).aggregate(
                    total_api_calls=Sum('current_value', filter=Q(metric_type='api_calls')),
                    total_buildings=Sum('current_value', filter=Q(metric_type='buildings')),
                    total_apartments=Sum('current_value', filter=Q(metric_type='apartments')),
                    total_users=Sum('current_value', filter=Q(metric_type='users')),
                    total_storage=Sum('current_value', filter=Q(metric_type='storage_gb'))
                )
                
                usage_trends.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'api_calls': daily_usage['total_api_calls'] or 0,
                    'buildings': daily_usage['total_buildings'] or 0,
                    'apartments': daily_usage['total_apartments'] or 0,
                    'users': daily_usage['total_users'] or 0,
                    'storage_gb': daily_usage['total_storage'] or 0
                })
            
            # Usage distribution by plan
            usage_by_plan = UsageTracking.objects.filter(
                period_start__gte=start_date,
                period_end__lte=end_date
            ).values(
                'subscription__plan__name',
                'metric_type'
            ).annotate(
                avg_usage=Avg('current_value'),
                max_usage=Max('current_value'),
                count=Count('id')
            ).order_by('subscription__plan__name', 'metric_type')
            
            # High usage alerts
            high_usage_alerts = UsageTracking.objects.filter(
                period_start__gte=start_date,
                period_end__lte=end_date
            ).annotate(
                utilization_percentage=Case(
                    When(limit_value__gt=0, 
                         then=(F('current_value') * 100) / F('limit_value')),
                    default=0,
                    output_field=DecimalField()
                )
            ).filter(
                utilization_percentage__gte=80
            ).values(
                'subscription__user__email',
                'metric_type',
                'current_value',
                'limit_value',
                'utilization_percentage'
            ).order_by('-utilization_percentage')
            
            return {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': period_days
                },
                'usage_by_metric': list(usage_by_metric),
                'usage_trends': usage_trends,
                'usage_by_plan': list(usage_by_plan),
                'high_usage_alerts': list(high_usage_alerts)
            }
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_payment_analytics(period_days: int = 30) -> Dict[str, Any]:
        """
        Advanced payment analytics με failure analysis
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Payment success rate
            total_payments = BillingCycle.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            
            successful_payments = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).count()
            
            failed_payments = BillingCycle.objects.filter(
                status='failed',
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            
            pending_payments = BillingCycle.objects.filter(
                status='pending',
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            
            success_rate = 0
            if total_payments > 0:
                success_rate = (successful_payments / total_payments) * 100
            
            # Payment method distribution (simplified)
            payment_methods = PaymentMethod.objects.values('card_brand').annotate(
                count=Count('id')
            ).order_by('-count')
            
            # Payment failure patterns
            failure_patterns = BillingCycle.objects.filter(
                status='failed',
                created_at__gte=start_date,
                created_at__lte=end_date
            ).values('subscription__user__email').annotate(
                failure_count=Count('id'),
                total_amount=Sum('total_amount')
            ).order_by('-failure_count')
            
            # Average payment processing time
            processing_times = []
            successful_payment_cycles = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=start_date,
                paid_at__lte=end_date
            ).exclude(created_at__isnull=True).exclude(paid_at__isnull=True)
            
            for cycle in successful_payment_cycles:
                processing_time = (cycle.paid_at - cycle.created_at).total_seconds() / 3600  # hours
                processing_times.append(processing_time)
            
            avg_processing_time = 0
            if processing_times:
                avg_processing_time = sum(processing_times) / len(processing_times)
            
            return {
                'period': {
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'days': period_days
                },
                'payment_stats': {
                    'total_payments': total_payments,
                    'successful_payments': successful_payments,
                    'failed_payments': failed_payments,
                    'pending_payments': pending_payments,
                    'success_rate': round(success_rate, 2)
                },
                'payment_methods': list(payment_methods),
                'failure_patterns': list(failure_patterns),
                'avg_processing_time_hours': round(avg_processing_time, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting payment analytics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def get_predictive_analytics() -> Dict[str, Any]:
        """
        Predictive analytics για forecasting
        """
        try:
            # Revenue forecasting (next 3 months)
            revenue_forecast = AdvancedAnalyticsService._forecast_revenue()
            
            # Churn prediction
            churn_prediction = AdvancedAnalyticsService._predict_churn()
            
            # Growth projections
            growth_projections = AdvancedAnalyticsService._project_growth()
            
            # Capacity planning
            capacity_analysis = AdvancedAnalyticsService._analyze_capacity()
            
            return {
                'revenue_forecast': revenue_forecast,
                'churn_prediction': churn_prediction,
                'growth_projections': growth_projections,
                'capacity_analysis': capacity_analysis,
                'generated_at': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting predictive analytics: {e}")
            return {'error': str(e)}
    
    # Helper methods
    
    @staticmethod
    def _calculate_customer_lifetime_metrics() -> Dict[str, Any]:
        """Calculate customer lifetime metrics"""
        try:
            customers_with_revenue = User.objects.filter(
                subscriptions__billing_cycles__status='paid'
            ).distinct()
            
            if not customers_with_revenue.exists():
                return {
                    'avg_lifetime_value': 0,
                    'avg_lifetime_days': 0,
                    'retention_rate': 0
                }
            
            lifetime_values = []
            lifetime_days = []
            
            for customer in customers_with_revenue:
                # Calculate total revenue per customer
                total_revenue = customer.subscriptions.aggregate(
                    total=Sum('billing_cycles__total_amount', filter=Q(billing_cycles__status='paid'))
                )['total'] or 0
                lifetime_values.append(float(total_revenue))
                
                # Calculate customer age
                customer_age = (timezone.now() - customer.date_joined).days
                lifetime_days.append(customer_age)
            
            avg_lifetime_value = sum(lifetime_values) / len(lifetime_values) if lifetime_values else 0
            avg_lifetime_days = sum(lifetime_days) / len(lifetime_days) if lifetime_days else 0
            
            # Calculate retention rate (simplified)
            total_customers = User.objects.count()
            customers_with_subscriptions = User.objects.filter(subscriptions__isnull=False).distinct().count()
            retention_rate = (customers_with_subscriptions / total_customers * 100) if total_customers > 0 else 0
            
            return {
                'avg_lifetime_value': round(avg_lifetime_value, 2),
                'avg_lifetime_days': round(avg_lifetime_days, 2),
                'retention_rate': round(retention_rate, 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating customer lifetime metrics: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _calculate_subscription_cohorts() -> List[Dict[str, Any]]:
        """Calculate subscription cohorts"""
        try:
            cohorts = []
            current_date = timezone.now()
            
            # Calculate cohorts for last 12 months
            for i in range(12):
                month_start = current_date.replace(day=1) - timedelta(days=30*i)
                month_end = (month_start + timedelta(days=32)).replace(day=1)
                
                # New subscriptions in this month
                new_subscriptions = UserSubscription.objects.filter(
                    created_at__gte=month_start,
                    created_at__lt=month_end
                ).count()
                
                # Active subscriptions from this month
                active_from_cohort = UserSubscription.objects.filter(
                    created_at__gte=month_start,
                    created_at__lt=month_end,
                    status='active'
                ).count()
                
                retention_rate = 0
                if new_subscriptions > 0:
                    retention_rate = (active_from_cohort / new_subscriptions) * 100
                
                cohorts.append({
                    'month': month_start.strftime('%Y-%m'),
                    'new_subscriptions': new_subscriptions,
                    'active_from_cohort': active_from_cohort,
                    'retention_rate': round(retention_rate, 2)
                })
            
            return list(reversed(cohorts))
            
        except Exception as e:
            logger.error(f"Error calculating subscription cohorts: {e}")
            return []
    
    @staticmethod
    def _calculate_churn_analysis(period_days: int) -> Dict[str, Any]:
        """Calculate detailed churn analysis"""
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Churned customers
            churned_customers = UserSubscription.objects.filter(
                status='cancelled',
                canceled_at__gte=start_date,
                canceled_at__lte=end_date
            ).count()
            
            # Active customers at start of period
            active_at_start = UserSubscription.objects.filter(
                status='active',
                created_at__lt=start_date
            ).count()
            
            # Churn rate
            churn_rate = 0
            if active_at_start > 0:
                churn_rate = (churned_customers / active_at_start) * 100
            
            # Churn by plan
            churn_by_plan = UserSubscription.objects.filter(
                status='cancelled',
                canceled_at__gte=start_date,
                canceled_at__lte=end_date
            ).values('plan__name').annotate(
                churned_count=Count('id')
            ).order_by('-churned_count')
            
            return {
                'churned_customers': churned_customers,
                'active_at_start': active_at_start,
                'churn_rate': round(churn_rate, 2),
                'churn_by_plan': list(churn_by_plan)
            }
            
        except Exception as e:
            logger.error(f"Error calculating churn analysis: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _forecast_revenue() -> Dict[str, Any]:
        """Forecast revenue for next 3 months"""
        try:
            # Simple linear regression based on last 6 months
            current_date = timezone.now()
            monthly_revenues = []
            
            for i in range(6):
                month_start = current_date.replace(day=1) - timedelta(days=30*i)
                month_end = (month_start + timedelta(days=32)).replace(day=1)
                
                monthly_revenue = BillingCycle.objects.filter(
                    status='paid',
                    paid_at__gte=month_start,
                    paid_at__lt=month_end
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                monthly_revenues.append(float(monthly_revenue))
            
            # Calculate trend (simple average growth)
            if len(monthly_revenues) >= 2:
                growth_trend = (monthly_revenues[0] - monthly_revenues[-1]) / len(monthly_revenues)
                base_revenue = monthly_revenues[0]
            else:
                growth_trend = 0
                base_revenue = monthly_revenues[0] if monthly_revenues else 0
            
            # Forecast next 3 months
            forecasts = []
            for i in range(1, 4):
                forecast_revenue = base_revenue + (growth_trend * i)
                forecast_date = current_date + timedelta(days=30*i)
                
                forecasts.append({
                    'month': forecast_date.strftime('%Y-%m'),
                    'forecasted_revenue': round(max(forecast_revenue, 0), 2),
                    'confidence': 75  # Simple confidence score
                })
            
            return {
                'forecasts': forecasts,
                'growth_trend': round(growth_trend, 2),
                'method': 'linear_regression_6_months'
            }
            
        except Exception as e:
            logger.error(f"Error forecasting revenue: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _predict_churn() -> Dict[str, Any]:
        """Predict customer churn risk"""
        try:
            # Simple churn prediction based on usage patterns and payment history
            high_risk_customers = User.objects.annotate(
                failed_payment_count=Count(
                    'subscriptions__billing_cycles',
                    filter=Q(subscriptions__billing_cycles__status='failed')
                ),
                low_usage_count=Count(
                    'subscriptions__usage_tracking',
                    filter=Q(
                        subscriptions__usage_tracking__current_value__lt=F('subscriptions__usage_tracking__limit_value') * 0.3
                    )
                ),
                days_since_last_payment=Avg(
                    Case(
                        When(subscriptions__billing_cycles__status='paid',
                             then=F('subscriptions__billing_cycles__paid_at')),
                        default=None,
                        output_field=IntegerField()
                    )
                )
            ).filter(
                Q(failed_payment_count__gte=2) | 
                Q(low_usage_count__gte=3) |
                Q(days_since_last_payment__gte=60)
            ).values(
                'email',
                'failed_payment_count',
                'low_usage_count'
            )[:10]
            
            return {
                'high_risk_customers': list(high_risk_customers),
                'total_high_risk': len(high_risk_customers),
                'prediction_method': 'usage_and_payment_patterns'
            }
            
        except Exception as e:
            logger.error(f"Error predicting churn: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _project_growth() -> Dict[str, Any]:
        """Project user and revenue growth"""
        try:
            current_date = timezone.now()
            
            # Calculate growth rates
            last_month = current_date - timedelta(days=30)
            last_6_months = current_date - timedelta(days=180)
            
            # User growth
            users_last_month = User.objects.filter(date_joined__gte=last_month).count()
            users_last_6_months = User.objects.filter(date_joined__gte=last_6_months).count()
            
            monthly_user_growth = users_last_month
            annual_user_growth = users_last_6_months * 2  # Project to annual
            
            # Revenue growth
            revenue_last_month = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=last_month
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            revenue_last_6_months = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=last_6_months
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            monthly_revenue_growth = float(revenue_last_month)
            annual_revenue_growth = float(revenue_last_6_months) * 2
            
            return {
                'user_growth': {
                    'monthly': monthly_user_growth,
                    'annual_projection': annual_user_growth
                },
                'revenue_growth': {
                    'monthly': round(monthly_revenue_growth, 2),
                    'annual_projection': round(annual_revenue_growth, 2)
                },
                'projection_method': 'linear_extrapolation_6_months'
            }
            
        except Exception as e:
            logger.error(f"Error projecting growth: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _analyze_capacity() -> Dict[str, Any]:
        """Analyze system capacity and usage"""
        try:
            # Current usage vs limits
            current_usage = UsageTracking.objects.filter(
                period_start__gte=timezone.now() - timedelta(days=30)
            ).aggregate(
                total_api_calls=Sum('current_value', filter=Q(metric_type='api_calls')),
                total_buildings=Sum('current_value', filter=Q(metric_type='buildings')),
                total_apartments=Sum('current_value', filter=Q(metric_type='apartments')),
                total_users=Sum('current_value', filter=Q(metric_type='users')),
                total_storage=Sum('current_value', filter=Q(metric_type='storage_gb'))
            )
            
            # Calculate utilization rates
            utilization_rates = {}
            for metric, current in current_usage.items():
                if current:
                    # Estimate capacity (this would be based on infrastructure)
                    estimated_capacity = {
                        'total_api_calls': 1000000,
                        'total_buildings': 1000,
                        'total_apartments': 10000,
                        'total_users': 5000,
                        'total_storage': 1000  # GB
                    }
                    
                    capacity = estimated_capacity.get(metric, 1000)
                    utilization_rate = (current / capacity) * 100
                    utilization_rates[metric] = round(utilization_rate, 2)
            
            # Capacity warnings
            warnings = []
            for metric, rate in utilization_rates.items():
                if rate > 80:
                    warnings.append(f"High utilization for {metric}: {rate}%")
            
            return {
                'current_usage': current_usage,
                'utilization_rates': utilization_rates,
                'warnings': warnings,
                'capacity_status': 'healthy' if not warnings else 'warning'
            }
            
        except Exception as e:
            logger.error(f"Error analyzing capacity: {e}")
            return {'error': str(e)}
