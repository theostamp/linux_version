# billing/admin_dashboard.py

from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime
from decimal import Decimal
from typing import Dict, List, Any
import logging

from .models import (
    SubscriptionPlan, UserSubscription, BillingCycle,
    UsageTracking, PaymentMethod
)
from .services import BillingService
from .analytics import UsageAnalyticsService

User = get_user_model()
logger = logging.getLogger(__name__)

CANCELED_STATUSES = ['canceled', 'cancelled']


class AdminDashboardService:
    """
    Comprehensive admin dashboard service για τη διαχείριση του συστήματος
    """

    @staticmethod
    def get_dashboard_overview() -> Dict[str, Any]:
        """
        Get comprehensive dashboard overview
        """
        try:
            # User statistics
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            verified_users = User.objects.filter(email_verified=True).count()

            # Subscription statistics
            total_subscriptions = UserSubscription.objects.count()
            active_subscriptions = UserSubscription.objects.filter(
                status__in=['trial', 'active']
            ).count()
            trial_subscriptions = UserSubscription.objects.filter(status='trial').count()
            cancelled_subscriptions = UserSubscription.objects.filter(status__in=CANCELED_STATUSES).count()

            # Plan distribution
            plan_distribution = UserSubscription.objects.values('plan__name').annotate(
                count=Count('id')
            ).order_by('-count')

            # Revenue statistics
            total_revenue = sum(
                float(cycle.total_amount) for cycle in
                BillingCycle.objects.filter(status='paid')
                if cycle.total_amount
            )

            pending_revenue = sum(
                float(cycle.total_amount) for cycle in
                BillingCycle.objects.filter(status='pending')
            )

            monthly_revenue = AdminDashboardService._calculate_monthly_revenue()

            # Invoice statistics
            total_invoices = BillingCycle.objects.count()
            paid_invoices = BillingCycle.objects.filter(status='paid').count()
            pending_invoices = BillingCycle.objects.filter(status='pending').count()
            failed_invoices = BillingCycle.objects.filter(status='failed').count()

            # Usage statistics
            usage_stats = AdminDashboardService._get_usage_statistics()

            # Recent activity
            recent_activity = AdminDashboardService._get_recent_activity()

            return {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'verified': verified_users,
                    'verification_rate': round((verified_users / total_users * 100), 2) if total_users > 0 else 0
                },
                'subscriptions': {
                    'total': total_subscriptions,
                    'active': active_subscriptions,
                    'trial': trial_subscriptions,
                    'cancelled': cancelled_subscriptions,
                    'conversion_rate': round((active_subscriptions / total_subscriptions * 100), 2) if total_subscriptions > 0 else 0
                },
                'plans': {
                    'distribution': list(plan_distribution),
                    'total_plans': SubscriptionPlan.objects.filter(is_active=True).count()
                },
                'revenue': {
                    'total': round(total_revenue, 2),
                    'pending': round(pending_revenue, 2),
                    'monthly': round(monthly_revenue, 2),
                    'mrr': round(AdminDashboardService._calculate_mrr(), 2)  # Monthly Recurring Revenue
                },
                'invoices': {
                    'total': total_invoices,
                    'paid': paid_invoices,
                    'pending': pending_invoices,
                    'failed': failed_invoices,
                    'payment_rate': round((paid_invoices / total_invoices * 100), 2) if total_invoices > 0 else 0
                },
                'usage': usage_stats,
                'activity': recent_activity
            }

        except Exception as e:
            logger.error(f"Error getting dashboard overview: {e}")
            return {'error': str(e)}

    @staticmethod
    def get_user_management_data() -> Dict[str, Any]:
        """
        Get user management data για admin
        """
        try:
            # Recent registrations
            recent_users = User.objects.filter(
                date_joined__gte=timezone.now() - timedelta(days=30)
            ).order_by('-date_joined')[:10]

            # Users by status
            users_by_status = User.objects.values('is_active', 'email_verified').annotate(
                count=Count('id')
            )

            # Users with subscriptions
            users_with_subscriptions = User.objects.filter(
                subscriptions__isnull=False
            ).distinct().count()

            # Users without subscriptions
            users_without_subscriptions = User.objects.filter(
                subscriptions__isnull=True
            ).count()

            return {
                'recent_users': [
                    {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'date_joined': user.date_joined,
                        'is_active': user.is_active,
                        'email_verified': user.email_verified,
                        'has_subscription': user.subscriptions.exists()
                    }
                    for user in recent_users
                ],
                'status_distribution': list(users_by_status),
                'subscription_stats': {
                    'with_subscription': users_with_subscriptions,
                    'without_subscription': users_without_subscriptions
                }
            }

        except Exception as e:
            logger.error(f"Error getting user management data: {e}")
            return {'error': str(e)}

    @staticmethod
    def get_subscription_management_data() -> Dict[str, Any]:
        """
        Get subscription management data για admin
        """
        try:
            # Subscriptions by status
            subscriptions_by_status = UserSubscription.objects.values('status').annotate(
                count=Count('id')
            ).order_by('-count')

            # Subscriptions by plan
            subscriptions_by_plan = UserSubscription.objects.values(
                'plan__name', 'plan__plan_type'
            ).annotate(
                count=Count('id')
            ).order_by('-count')

            # Trial expirations (next 7 days)
            upcoming_trial_expirations = UserSubscription.objects.filter(
                status='trial',
                trial_end__lte=timezone.now() + timedelta(days=7),
                trial_end__gte=timezone.now()
            ).order_by('trial_end')[:10]

            # Failed payments
            failed_payments = BillingCycle.objects.filter(
                status='failed'
            ).order_by('-created_at')[:10]

            return {
                'status_distribution': list(subscriptions_by_status),
                'plan_distribution': list(subscriptions_by_plan),
                'upcoming_trial_expirations': [
                    {
                        'id': sub.id,
                        'user_email': sub.user.email,
                        'plan_name': sub.plan.name,
                        'trial_end': sub.trial_end,
                        'days_remaining': (sub.trial_end - timezone.now()).days if sub.trial_end else 0
                    }
                    for sub in upcoming_trial_expirations
                ],
                'failed_payments': [
                    {
                        'id': cycle.id,
                        'user_email': cycle.subscription.user.email,
                        'amount_due': float(cycle.amount_due),
                        'due_date': cycle.due_date,
                        'created_at': cycle.created_at
                    }
                    for cycle in failed_payments
                ]
            }

        except Exception as e:
            logger.error(f"Error getting subscription management data: {e}")
            return {'error': str(e)}

    @staticmethod
    def get_financial_overview() -> Dict[str, Any]:
        """
        Get financial overview για admin
        """
        try:
            # Revenue trends (last 12 months)
            revenue_trends = AdminDashboardService._get_revenue_trends()

            # Payment method distribution
            payment_methods = PaymentMethod.objects.values('card_brand').annotate(
                count=Count('id')
            ).order_by('-count')

            # Average invoice amounts
            avg_invoice_amount = BillingCycle.objects.filter(
                status='paid'
            ).aggregate(avg_amount=Avg('amount_paid'))['avg_amount'] or 0

            # Churn rate calculation
            churn_rate = AdminDashboardService._calculate_churn_rate()

            # Customer lifetime value (CLV)
            clv = AdminDashboardService._calculate_customer_lifetime_value()

            return {
                'revenue_trends': revenue_trends,
                'payment_methods': list(payment_methods),
                'metrics': {
                    'avg_invoice_amount': round(float(avg_invoice_amount), 2),
                    'churn_rate': round(churn_rate, 2),
                    'customer_lifetime_value': round(clv, 2),
                    'mrr': round(AdminDashboardService._calculate_mrr(), 2),
                    'arr': round(AdminDashboardService._calculate_arr(), 2)  # Annual Recurring Revenue
                }
            }

        except Exception as e:
            logger.error(f"Error getting financial overview: {e}")
            return {'error': str(e)}

    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """
        Get system health metrics για admin
        """
        try:
            # Database health
            db_health = AdminDashboardService._check_database_health()

            # Email delivery status
            email_health = AdminDashboardService._check_email_health()

            # Payment processing health
            payment_health = AdminDashboardService._check_payment_health()

            # Usage limits warnings
            usage_warnings = AdminDashboardService._get_usage_warnings()

            return {
                'database': db_health,
                'email': email_health,
                'payments': payment_health,
                'usage_warnings': usage_warnings,
                'overall_health': AdminDashboardService._calculate_overall_health(
                    db_health, email_health, payment_health
                )
            }

        except Exception as e:
            logger.error(f"Error getting system health: {e}")
            return {'error': str(e)}

    # Helper methods

    @staticmethod
    def _calculate_monthly_revenue() -> float:
        """Calculate revenue for current month"""
        current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)

        revenue = BillingCycle.objects.filter(
            status='paid',
            paid_at__gte=current_month,
            paid_at__lt=next_month
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        return float(revenue)

    @staticmethod
    def _calculate_mrr() -> float:
        """Calculate Monthly Recurring Revenue"""
        active_subscriptions = UserSubscription.objects.filter(
            status__in=['trial', 'active']
        )

        mrr = 0
        for sub in active_subscriptions:
            if sub.billing_interval == 'month':
                mrr += float(sub.price)
            elif sub.billing_interval == 'year':
                mrr += float(sub.price) / 12

        return mrr

    @staticmethod
    def _calculate_arr() -> float:
        """Calculate Annual Recurring Revenue"""
        return AdminDashboardService._calculate_mrr() * 12

    @staticmethod
    def _get_usage_statistics() -> Dict[str, Any]:
        """Get usage statistics"""
        try:
            # Get current month usage
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (current_month + timedelta(days=32)).replace(day=1)

            usage_data = UsageTracking.objects.filter(
                period_start__gte=current_month,
                period_end__lt=next_month
            ).values('metric_type').annotate(
                total_usage=Sum('current_value'),
                avg_usage=Avg('current_value')
            )

            return {
                'current_month': list(usage_data),
                'total_tracked_metrics': UsageTracking.objects.filter(
                    period_start__gte=current_month,
                    period_end__lt=next_month
                ).count()
            }

        except Exception as e:
            logger.error(f"Error getting usage statistics: {e}")
            return {'error': str(e)}

    @staticmethod
    def _get_recent_activity() -> List[Dict[str, Any]]:
        """Get recent system activity"""
        try:
            activities = []

            # Recent user registrations
            recent_users = User.objects.filter(
                date_joined__gte=timezone.now() - timedelta(days=7)
            ).order_by('-date_joined')[:5]

            for user in recent_users:
                activities.append({
                    'type': 'user_registration',
                    'description': f'New user registered: {user.email}',
                    'timestamp': user.date_joined,
                    'user': user.email
                })

            # Recent payments
            recent_payments = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=timezone.now() - timedelta(days=7)
            ).order_by('-paid_at')[:5]

            for payment in recent_payments:
                activities.append({
                    'type': 'payment_received',
                    'description': f'Payment received: €{payment.amount_paid}',
                    'timestamp': payment.paid_at,
                    'user': payment.subscription.user.email
                })

            # Sort by timestamp
            activities.sort(key=lambda x: x['timestamp'], reverse=True)

            return activities[:10]

        except Exception as e:
            logger.error(f"Error getting recent activity: {e}")
            return []

    @staticmethod
    def _get_revenue_trends() -> List[Dict[str, Any]]:
        """Get revenue trends for last 12 months"""
        try:
            trends = []
            current_date = timezone.now()

            for i in range(12):
                month_start = current_date.replace(day=1) - timedelta(days=30*i)
                month_end = (month_start + timedelta(days=32)).replace(day=1)

                revenue = BillingCycle.objects.filter(
                    status='paid',
                    paid_at__gte=month_start,
                    paid_at__lt=month_end
                ).aggregate(total=Sum('total_amount'))['total'] or 0

                trends.append({
                    'month': month_start.strftime('%Y-%m'),
                    'revenue': float(revenue)
                })

            return list(reversed(trends))

        except Exception as e:
            logger.error(f"Error getting revenue trends: {e}")
            return []

    @staticmethod
    def _calculate_churn_rate() -> float:
        """Calculate churn rate (percentage of customers who cancel)"""
        try:
            # Get subscriptions that ended in last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)

            cancelled_recently = UserSubscription.objects.filter(
                status__in=CANCELED_STATUSES,
                canceled_at__gte=thirty_days_ago
            ).count()

            total_active_month_ago = UserSubscription.objects.filter(
                status__in=['trial', 'active'],
                created_at__lte=thirty_days_ago
            ).count()

            if total_active_month_ago == 0:
                return 0.0

            return (cancelled_recently / total_active_month_ago) * 100

        except Exception as e:
            logger.error(f"Error calculating churn rate: {e}")
            return 0.0

    @staticmethod
    def _calculate_customer_lifetime_value() -> float:
        """Calculate average customer lifetime value"""
        try:
            # Get all paid invoices
            paid_invoices = BillingCycle.objects.filter(status='paid')

            if not paid_invoices.exists():
                return 0.0

            # Calculate average revenue per customer
            customer_revenue = {}
            for invoice in paid_invoices:
                user_email = invoice.subscription.user.email
                if user_email not in customer_revenue:
                    customer_revenue[user_email] = 0
                customer_revenue[user_email] += float(invoice.total_amount or 0)

            if not customer_revenue:
                return 0.0

            return sum(customer_revenue.values()) / len(customer_revenue)

        except Exception as e:
            logger.error(f"Error calculating CLV: {e}")
            return 0.0

    @staticmethod
    def _check_database_health() -> Dict[str, Any]:
        """Check database health"""
        try:
            # Simple health check
            user_count = User.objects.count()
            subscription_count = UserSubscription.objects.count()

            return {
                'status': 'healthy',
                'user_count': user_count,
                'subscription_count': subscription_count,
                'last_check': timezone.now()
            }

        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_check': timezone.now()
            }

    @staticmethod
    def _check_email_health() -> Dict[str, Any]:
        """Check email system health"""
        # This would typically check email service status
        # For now, return a basic status
        return {
            'status': 'healthy',
            'last_check': timezone.now()
        }

    @staticmethod
    def _check_payment_health() -> Dict[str, Any]:
        """Check payment system health"""
        try:
            # Check recent payment success rate
            recent_payments = BillingCycle.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            )

            total_payments = recent_payments.count()
            successful_payments = recent_payments.filter(status='paid').count()

            success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 100

            return {
                'status': 'healthy' if success_rate > 90 else 'warning',
                'success_rate': round(success_rate, 2),
                'total_payments': total_payments,
                'successful_payments': successful_payments,
                'last_check': timezone.now()
            }

        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_check': timezone.now()
            }

    @staticmethod
    def _get_usage_warnings() -> List[Dict[str, Any]]:
        """Get usage warnings for admin"""
        try:
            warnings = []

            # Check for users approaching limits
            current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = (current_month + timedelta(days=32)).replace(day=1)

            usage_data = UsageTracking.objects.filter(
                period_start__gte=current_month,
                period_end__lt=next_month
            )

            for usage in usage_data:
                if usage.limit_value > 0:
                    utilization = (usage.current_value / usage.limit_value) * 100
                    if utilization > 80:
                        warnings.append({
                            'type': 'high_usage',
                            'user_email': usage.subscription.user.email,
                            'metric': usage.metric_type,
                            'utilization': round(utilization, 2),
                            'current_value': usage.current_value,
                            'limit_value': usage.limit_value
                        })

            return warnings

        except Exception as e:
            logger.error(f"Error getting usage warnings: {e}")
            return []

    @staticmethod
    def _calculate_overall_health(db_health: Dict, email_health: Dict, payment_health: Dict) -> str:
        """Calculate overall system health"""
        health_scores = []

        if db_health.get('status') == 'healthy':
            health_scores.append(1)
        else:
            health_scores.append(0)

        if email_health.get('status') == 'healthy':
            health_scores.append(1)
        else:
            health_scores.append(0)

        if payment_health.get('status') == 'healthy':
            health_scores.append(1)
        elif payment_health.get('status') == 'warning':
            health_scores.append(0.5)
        else:
            health_scores.append(0)

        avg_score = sum(health_scores) / len(health_scores)

        if avg_score >= 0.8:
            return 'healthy'
        elif avg_score >= 0.5:
            return 'warning'
        else:
            return 'critical'
