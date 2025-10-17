# admin/billing_views.py

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Avg, Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime
import logging

from ..billing.models import UserSubscription, BillingCycle, PaymentMethod, UsageTracking
from ..core.permissions import IsSuperUser
from ..billing.services import BillingService

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminBillingStatsView(APIView):
    """
    Admin billing statistics και analytics
    """
    permission_classes = [IsSuperUser]
    
    def get(self, request):
        """
        Get comprehensive billing statistics
        """
        try:
            period = request.query_params.get('period', '30d')
            days = self._parse_period(period)
            
            # Overview statistics
            overview = self._get_overview_stats()
            
            # Revenue trends
            revenue_trends = self._get_revenue_trends(days)
            
            # Payment methods distribution
            payment_methods = self._get_payment_methods_distribution()
            
            # Key metrics
            metrics = self._get_key_metrics()
            
            return Response({
                'overview': overview,
                'revenue_trends': revenue_trends,
                'payment_methods': payment_methods,
                'metrics': metrics,
                'period_days': days,
            })
            
        except Exception as e:
            logger.error(f"Error getting billing stats: {e}")
            return Response({
                'error': 'Failed to get billing statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _parse_period(self, period):
        """
        Parse period string to days
        """
        period_map = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365,
        }
        return period_map.get(period, 30)
    
    def _get_overview_stats(self):
        """
        Get overview statistics
        """
        # Total revenue
        total_revenue = BillingCycle.objects.filter(status='paid').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Monthly revenue
        current_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (current_month + timedelta(days=32)).replace(day=1)
        
        monthly_revenue = BillingCycle.objects.filter(
            status='paid',
            paid_at__gte=current_month,
            paid_at__lt=next_month
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Yearly revenue
        current_year = timezone.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        next_year = current_year.replace(year=current_year.year + 1)
        
        yearly_revenue = BillingCycle.objects.filter(
            status='paid',
            paid_at__gte=current_year,
            paid_at__lt=next_year
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Pending revenue
        pending_revenue = BillingCycle.objects.filter(status='pending').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        # Invoice statistics
        total_invoices = BillingCycle.objects.count()
        paid_invoices = BillingCycle.objects.filter(status='paid').count()
        pending_invoices = BillingCycle.objects.filter(status='pending').count()
        failed_invoices = BillingCycle.objects.filter(status='failed').count()
        
        # Payment rate
        payment_rate = (paid_invoices / total_invoices * 100) if total_invoices > 0 else 0
        
        return {
            'total_revenue': float(total_revenue),
            'monthly_revenue': float(monthly_revenue),
            'yearly_revenue': float(yearly_revenue),
            'pending_revenue': float(pending_revenue),
            'total_invoices': total_invoices,
            'paid_invoices': paid_invoices,
            'pending_invoices': pending_invoices,
            'failed_invoices': failed_invoices,
            'payment_rate': round(payment_rate, 2),
        }
    
    def _get_revenue_trends(self, days):
        """
        Get revenue trends for specified period
        """
        trends = []
        current_date = timezone.now()
        
        # Get daily revenue for the period
        for i in range(days):
            date = current_date - timedelta(days=i)
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            daily_revenue = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=day_start,
                paid_at__lt=day_end
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            trends.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'revenue': float(daily_revenue),
            })
        
        # Reverse to get chronological order
        trends.reverse()
        
        # Get monthly revenue for last 12 months
        monthly_trends = []
        for i in range(12):
            month_start = current_date.replace(day=1) - timedelta(days=30*i)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            
            monthly_revenue = BillingCycle.objects.filter(
                status='paid',
                paid_at__gte=month_start,
                paid_at__lt=month_end
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            monthly_trends.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': float(monthly_revenue),
            })
        
        monthly_trends.reverse()
        
        return {
            'daily': trends[-30:] if days >= 30 else trends,  # Last 30 days max
            'monthly': monthly_trends,
        }
    
    def _get_payment_methods_distribution(self):
        """
        Get payment methods distribution
        """
        payment_methods = PaymentMethod.objects.values('card_brand').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return list(payment_methods)
    
    def _get_key_metrics(self):
        """
        Get key financial metrics
        """
        # Average invoice amount
        avg_invoice_amount = BillingCycle.objects.filter(status='paid').aggregate(
            avg=Avg('total_amount')
        )['avg'] or 0
        
        # Churn rate
        churn_rate = self._calculate_churn_rate()
        
        # Customer lifetime value
        clv = self._calculate_customer_lifetime_value()
        
        # MRR
        mrr = self._calculate_mrr()
        
        # ARR
        arr = mrr * 12
        
        return {
            'avg_invoice_amount': float(avg_invoice_amount),
            'churn_rate': churn_rate,
            'customer_lifetime_value': clv,
            'mrr': mrr,
            'arr': arr,
        }
    
    def _calculate_churn_rate(self):
        """
        Calculate churn rate
        """
        try:
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
    
    def _calculate_customer_lifetime_value(self):
        """
        Calculate customer lifetime value
        """
        try:
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
            
            return round(sum(customer_revenue.values()) / len(customer_revenue), 2)
            
        except Exception as e:
            logger.error(f"Error calculating CLV: {e}")
            return 0.0
    
    def _calculate_mrr(self):
        """
        Calculate Monthly Recurring Revenue
        """
        try:
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
            
        except Exception as e:
            logger.error(f"Error calculating MRR: {e}")
            return 0.0


class AdminRecentPaymentsView(APIView):
    """
    Recent payments για admin dashboard
    """
    permission_classes = [IsSuperUser]
    
    def get(self, request):
        """
        Get recent payments
        """
        try:
            limit = int(request.query_params.get('limit', 10))
            
            recent_payments = BillingCycle.objects.filter(
                status='paid',
                paid_at__isnull=False
            ).select_related('subscription__user').order_by('-paid_at')[:limit]
            
            payments_data = []
            for payment in recent_payments:
                payments_data.append({
                    'id': str(payment.id),
                    'user_email': payment.subscription.user.email,
                    'amount': float(payment.total_amount),
                    'status': payment.status,
                    'date': payment.paid_at,
                    'method': 'card',  # This would come from payment method data
                })
            
            return Response({
                'payments': payments_data,
                'total': len(payments_data)
            })
            
        except Exception as e:
            logger.error(f"Error getting recent payments: {e}")
            return Response({
                'error': 'Failed to get recent payments'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminGenerateMonthlyInvoicesView(APIView):
    """
    Generate monthly invoices για όλες τις ενεργές συνδρομές
    """
    permission_classes = [IsSuperUser]
    
    def post(self, request):
        """
        Generate monthly invoices
        """
        try:
            generated_count = BillingService.generate_monthly_invoices()
            
            logger.info(f"Generated {generated_count} monthly invoices by admin {request.user.email}")
            
            return Response({
                'message': f'Generated {generated_count} monthly invoices',
                'generated_count': generated_count
            })
            
        except Exception as e:
            logger.error(f"Error generating monthly invoices: {e}")
            return Response({
                'error': 'Failed to generate monthly invoices'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBillingExportView(APIView):
    """
    Export billing data
    """
    permission_classes = [IsSuperUser]
    
    def get(self, request):
        """
        Export billing data σε CSV format
        """
        try:
            import csv
            from django.http import HttpResponse
            
            export_type = request.query_params.get('type', 'invoices')
            
            if export_type == 'invoices':
                return self._export_invoices()
            elif export_type == 'revenue':
                return self._export_revenue()
            else:
                return Response({
                    'error': 'Invalid export type'
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error exporting billing data: {e}")
            return Response({
                'error': 'Failed to export billing data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _export_invoices(self):
        """
        Export invoices data
        """
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="billing_invoices_export.csv"'
        
        writer = csv.writer(response)
        
        # Write CSV header
        writer.writerow([
            'Invoice ID', 'User Email', 'Plan Name', 'Amount', 'Status',
            'Period Start', 'Period End', 'Paid At', 'Due Date'
        ])
        
        # Write invoice data
        invoices = BillingCycle.objects.select_related('subscription__user', 'subscription__plan').all()
        for invoice in invoices:
            writer.writerow([
                str(invoice.id),
                invoice.subscription.user.email,
                invoice.subscription.plan.name,
                float(invoice.total_amount),
                invoice.status,
                invoice.period_start.strftime('%Y-%m-%d'),
                invoice.period_end.strftime('%Y-%m-%d'),
                invoice.paid_at.strftime('%Y-%m-%d %H:%M:%S') if invoice.paid_at else '',
                invoice.due_date.strftime('%Y-%m-%d'),
            ])
        
        return response
    
    def _export_revenue(self):
        """
        Export revenue data
        """
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="revenue_export.csv"'
        
        writer = csv.writer(response)
        
        # Write CSV header
        writer.writerow([
            'Date', 'Revenue', 'Invoice Count', 'Paid Count', 'Pending Count', 'Failed Count'
        ])
        
        # Get daily revenue data for last 90 days
        current_date = timezone.now()
        for i in range(90):
            date = current_date - timedelta(days=i)
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            daily_data = BillingCycle.objects.filter(
                created_at__gte=day_start,
                created_at__lt=day_end
            )
            
            revenue = daily_data.filter(status='paid').aggregate(
                total=Sum('total_amount')
            )['total'] or 0
            
            invoice_count = daily_data.count()
            paid_count = daily_data.filter(status='paid').count()
            pending_count = daily_data.filter(status='pending').count()
            failed_count = daily_data.filter(status='failed').count()
            
            writer.writerow([
                day_start.strftime('%Y-%m-%d'),
                float(revenue),
                invoice_count,
                paid_count,
                pending_count,
                failed_count,
            ])
        
        return response
