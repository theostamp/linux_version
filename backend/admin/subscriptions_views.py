# admin/subscriptions_views.py

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Sum, Avg
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import logging

from billing.models import UserSubscription, SubscriptionPlan, BillingCycle, UsageTracking
from core.permissions import IsSuperUser
from billing.services import BillingService

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminSubscriptionsViewSet(ModelViewSet):
    """
    Admin ViewSet για διαχείριση συνδρομών
    """
    permission_classes = [IsSuperUser]
    
    def get_queryset(self):
        """
        Όλες οι συνδρομές για admin
        """
        return UserSubscription.objects.select_related('user', 'plan').all().order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        Λίστα όλων των συνδρομών με φίλτρα
        """
        queryset = self.get_queryset()
        
        # Apply filters
        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')
        plan_filter = request.query_params.get('plan', '')
        
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(plan__name__icontains=search)
            )
        
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        if plan_filter and plan_filter != 'all':
            queryset = queryset.filter(plan__plan_type=plan_filter)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            subscriptions_data = []
            for subscription in page:
                subscription_data = self._serialize_subscription(subscription)
                subscriptions_data.append(subscription_data)
            return self.get_paginated_response(subscriptions_data)
        
        subscriptions_data = [self._serialize_subscription(sub) for sub in queryset]
        return Response({
            'subscriptions': subscriptions_data,
            'total': queryset.count()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """
        Λεπτομέρειες συνδρομής
        """
        subscription = self.get_object()
        subscription_data = self._serialize_subscription(subscription, detailed=True)
        return Response(subscription_data)
    
    def _serialize_subscription(self, subscription, detailed=False):
        """
        Serialize subscription data
        """
        # Get usage stats
        usage_stats = self._get_subscription_usage(subscription)
        
        subscription_data = {
            'id': str(subscription.id),
            'user': {
                'id': subscription.user.id,
                'email': subscription.user.email,
                'first_name': subscription.user.first_name,
                'last_name': subscription.user.last_name,
            },
            'plan': {
                'id': subscription.plan.id,
                'name': subscription.plan.name,
                'plan_type': subscription.plan.plan_type,
                'monthly_price': float(subscription.plan.monthly_price),
                'yearly_price': float(subscription.plan.yearly_price),
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
            'usage_stats': usage_stats,
        }
        
        if detailed:
            # Add billing history
            billing_cycles = BillingCycle.objects.filter(subscription=subscription).order_by('-period_start')[:5]
            subscription_data['billing_history'] = [
                {
                    'id': str(cycle.id),
                    'period_start': cycle.period_start,
                    'period_end': cycle.period_end,
                    'total_amount': float(cycle.total_amount),
                    'status': cycle.status,
                    'paid_at': cycle.paid_at,
                    'due_date': cycle.due_date,
                }
                for cycle in billing_cycles
            ]
            
            # Add usage tracking details
            usage_tracking = UsageTracking.objects.filter(subscription=subscription).order_by('-recorded_at')[:10]
            subscription_data['usage_tracking'] = [
                {
                    'metric_type': usage.metric_type,
                    'usage_count': usage.usage_count,
                    'usage_limit': usage.usage_limit,
                    'usage_percentage': usage.usage_percentage,
                    'period_start': usage.period_start,
                    'period_end': usage.period_end,
                    'recorded_at': usage.recorded_at,
                }
                for usage in usage_tracking
            ]
        
        return subscription_data
    
    def _get_subscription_usage(self, subscription):
        """
        Get subscription usage statistics
        """
        # This is a simplified version - in real implementation,
        # you'd query the actual usage from your building/apartment models
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
            logger.error(f"Error getting usage stats for subscription {subscription.id}: {e}")
            return {'buildings': 0, 'apartments': 0, 'users': 0}
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Ακύρωση συνδρομής
        """
        subscription = self.get_object()
        
        try:
            success = BillingService.cancel_subscription(subscription, cancel_at_period_end=True)
            
            if success:
                logger.info(f"Subscription {subscription.id} cancelled by admin {request.user.email}")
                return Response({
                    'message': f'Subscription cancelled for {subscription.user.email}',
                    'subscription': self._serialize_subscription(subscription)
                })
            else:
                return Response({
                    'error': 'Failed to cancel subscription'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error cancelling subscription {subscription.id}: {e}")
            return Response({
                'error': 'Failed to cancel subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """
        Επαναφορά συνδρομής
        """
        subscription = self.get_object()
        
        try:
            subscription.status = 'active'
            subscription.canceled_at = None
            subscription.save()
            
            logger.info(f"Subscription {subscription.id} reactivated by admin {request.user.email}")
            
            return Response({
                'message': f'Subscription reactivated for {subscription.user.email}',
                'subscription': self._serialize_subscription(subscription)
            })
            
        except Exception as e:
            logger.error(f"Error reactivating subscription {subscription.id}: {e}")
            return Response({
                'error': 'Failed to reactivate subscription'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def extend_trial(self, request, pk=None):
        """
        Επέκταση trial period
        """
        subscription = self.get_object()
        days = request.data.get('days', 7)
        
        try:
            if subscription.trial_end:
                subscription.trial_end = subscription.trial_end + timedelta(days=days)
            else:
                subscription.trial_end = timezone.now() + timedelta(days=days)
            
            subscription.save()
            
            logger.info(f"Trial extended by {days} days for subscription {subscription.id} by admin {request.user.email}")
            
            return Response({
                'message': f'Trial extended by {days} days for {subscription.user.email}',
                'subscription': self._serialize_subscription(subscription)
            })
            
        except Exception as e:
            logger.error(f"Error extending trial for subscription {subscription.id}: {e}")
            return Response({
                'error': 'Failed to extend trial'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def generate_invoice(self, request, pk=None):
        """
        Δημιουργία τιμολογίου
        """
        subscription = self.get_object()
        
        try:
            invoice = BillingService.generate_invoice(subscription)
            
            if invoice:
                return Response({
                    'message': f'Invoice generated for {subscription.user.email}',
                    'invoice': {
                        'id': str(invoice.id),
                        'total_amount': float(invoice.total_amount),
                        'due_date': invoice.due_date,
                        'status': invoice.status,
                    }
                })
            else:
                return Response({
                    'error': 'Failed to generate invoice'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error generating invoice for subscription {subscription.id}: {e}")
            return Response({
                'error': 'Failed to generate invoice'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSubscriptionsStatsView(APIView):
    """
    Admin subscriptions statistics
    """
    permission_classes = [IsSuperUser]
    
    def get(self, request):
        """
        Get subscription statistics για admin dashboard
        """
        try:
            # Basic subscription counts
            total_subscriptions = UserSubscription.objects.count()
            active_subscriptions = UserSubscription.objects.filter(
                status__in=['trial', 'active']
            ).count()
            trial_subscriptions = UserSubscription.objects.filter(status='trial').count()
            canceled_subscriptions = UserSubscription.objects.filter(status='canceled').count()
            
            # Revenue calculations
            monthly_revenue = self._calculate_monthly_revenue()
            yearly_revenue = self._calculate_yearly_revenue()
            
            # Churn rate calculation
            churn_rate = self._calculate_churn_rate()
            
            # Conversion rate (trial to paid)
            conversion_rate = self._calculate_conversion_rate()
            
            # Upcoming trial expirations (next 7 days)
            seven_days_from_now = timezone.now() + timedelta(days=7)
            upcoming_trial_expirations = UserSubscription.objects.filter(
                status='trial',
                trial_end__lte=seven_days_from_now,
                trial_end__gte=timezone.now()
            ).count()
            
            # Failed payments
            failed_payments = BillingCycle.objects.filter(status='failed').count()
            
            return Response({
                'total_subscriptions': total_subscriptions,
                'active_subscriptions': active_subscriptions,
                'trial_subscriptions': trial_subscriptions,
                'canceled_subscriptions': canceled_subscriptions,
                'monthly_revenue': monthly_revenue,
                'yearly_revenue': yearly_revenue,
                'churn_rate': churn_rate,
                'conversion_rate': conversion_rate,
                'upcoming_trial_expirations': upcoming_trial_expirations,
                'failed_payments': failed_payments,
            })
            
        except Exception as e:
            logger.error(f"Error getting subscription stats: {e}")
            return Response({
                'error': 'Failed to get subscription statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _calculate_monthly_revenue(self):
        """
        Calculate monthly recurring revenue (MRR)
        """
        active_subscriptions = UserSubscription.objects.filter(
            status__in=['trial', 'active']
        )
        
        mrr = 0
        for sub in active_subscriptions:
            if sub.billing_interval == 'month':
                mrr += float(sub.price)
            elif sub.billing_interval == 'year':
                mrr += float(sub.price) / 12
        
        return round(mrr, 2)
    
    def _calculate_yearly_revenue(self):
        """
        Calculate yearly recurring revenue (ARR)
        """
        return self._calculate_monthly_revenue() * 12
    
    def _calculate_churn_rate(self):
        """
        Calculate churn rate (percentage of customers who cancel)
        """
        try:
            # Get subscriptions that ended in last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            cancelled_recently = UserSubscription.objects.filter(
                status='canceled',
                canceled_at__gte=thirty_days_ago
            ).count()
            
            total_active_month_ago = UserSubscription.objects.filter(
                status__in=['trial', 'active'],
                created_at__lte=thirty_days_ago
            ).count()
            
            if total_active_month_ago == 0:
                return 0.0
            
            return round((cancelled_recently / total_active_month_ago) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating churn rate: {e}")
            return 0.0
    
    def _calculate_conversion_rate(self):
        """
        Calculate trial to paid conversion rate
        """
        try:
            total_trials = UserSubscription.objects.filter(status='trial').count()
            converted_trials = UserSubscription.objects.filter(
                status='active',
                trial_end__isnull=False
            ).count()
            
            if total_trials == 0:
                return 0.0
            
            return round((converted_trials / total_trials) * 100, 2)
            
        except Exception as e:
            logger.error(f"Error calculating conversion rate: {e}")
            return 0.0


class AdminSubscriptionsExportView(APIView):
    """
    Export subscriptions data
    """
    permission_classes = [IsSuperUser]
    
    def get(self, request):
        """
        Export subscriptions data σε CSV format
        """
        try:
            import csv
            from django.http import HttpResponse
            
            # Create HttpResponse object with CSV header
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="subscriptions_export.csv"'
            
            writer = csv.writer(response)
            
            # Write CSV header
            writer.writerow([
                'Subscription ID', 'User Email', 'Plan Name', 'Status', 
                'Billing Interval', 'Price', 'Currency', 'Trial End',
                'Current Period End', 'Created At'
            ])
            
            # Write subscription data
            subscriptions = UserSubscription.objects.select_related('user', 'plan').all()
            for subscription in subscriptions:
                writer.writerow([
                    str(subscription.id),
                    subscription.user.email,
                    subscription.plan.name,
                    subscription.status,
                    subscription.billing_interval,
                    float(subscription.price),
                    subscription.currency,
                    subscription.trial_end.strftime('%Y-%m-%d') if subscription.trial_end else '',
                    subscription.current_period_end.strftime('%Y-%m-%d'),
                    subscription.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                ])
            
            return response
            
        except Exception as e:
            logger.error(f"Error exporting subscriptions: {e}")
            return Response({
                'error': 'Failed to export subscriptions data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
