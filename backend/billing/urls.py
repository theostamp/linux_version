# billing/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionPlanViewSet, UserSubscriptionViewSet,
    PaymentMethodViewSet, UsageTrackingViewSet,
    BillingCycleViewSet, StripeWebhookView,
    CreatePaymentIntentView, UsageAnalyticsView,
    UsageTrendsView, PlanComparisonView,
    BillingHistoryView, AdminUsageStatsView,
    InvoiceManagementView, PaymentProcessingView,
    AdminBillingManagementView, AdminDashboardView,
    AdminUserManagementView, AdminSubscriptionManagementView,
    AdminSystemHealthView, AdvancedAnalyticsView,
    RevenueAnalyticsView, CustomerAnalyticsView,
    SubscriptionAnalyticsView, UsageAnalyticsView as AdvancedUsageAnalyticsView,
    PaymentAnalyticsView, PredictiveAnalyticsView
)

app_name = 'billing'

# Router για ViewSets
router = DefaultRouter()
router.register(r'plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', UserSubscriptionViewSet, basename='user-subscription')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'usage-tracking', UsageTrackingViewSet, basename='usage-tracking')
router.register(r'billing-cycles', BillingCycleViewSet, basename='billing-cycle')

urlpatterns = [
    # API routes
    path('', include(router.urls)),
    
    # Stripe webhook
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    
    # Payment intent
    path('api/payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    
    # Usage Analytics
    path('api/analytics/usage/', UsageAnalyticsView.as_view(), name='usage-analytics'),
    path('api/analytics/trends/', UsageTrendsView.as_view(), name='usage-trends'),
    path('api/analytics/plan-comparison/', PlanComparisonView.as_view(), name='plan-comparison'),
    path('api/analytics/billing-history/', BillingHistoryView.as_view(), name='billing-history'),
    
    # Admin Analytics
    path('api/admin/usage-stats/', AdminUsageStatsView.as_view(), name='admin-usage-stats'),
    
    # Invoice Management
    path('api/invoices/', InvoiceManagementView.as_view(), name='invoice-management'),
    path('api/payments/process/', PaymentProcessingView.as_view(), name='payment-processing'),
    
    # Admin Billing Management
    path('api/admin/billing/', AdminBillingManagementView.as_view(), name='admin-billing-management'),
    
    # Admin Dashboard
    path('api/admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('api/admin/users/', AdminUserManagementView.as_view(), name='admin-user-management'),
    path('api/admin/subscriptions/', AdminSubscriptionManagementView.as_view(), name='admin-subscription-management'),
    path('api/admin/system-health/', AdminSystemHealthView.as_view(), name='admin-system-health'),
    
    # Advanced Analytics
    path('api/analytics/advanced/', AdvancedAnalyticsView.as_view(), name='advanced-analytics'),
    path('api/analytics/revenue/', RevenueAnalyticsView.as_view(), name='revenue-analytics'),
    path('api/analytics/customers/', CustomerAnalyticsView.as_view(), name='customer-analytics'),
    path('api/analytics/subscriptions/', SubscriptionAnalyticsView.as_view(), name='subscription-analytics'),
    path('api/analytics/usage-advanced/', AdvancedUsageAnalyticsView.as_view(), name='usage-analytics-advanced'),
    path('api/analytics/payments/', PaymentAnalyticsView.as_view(), name='payment-analytics'),
    path('api/analytics/predictive/', PredictiveAnalyticsView.as_view(), name='predictive-analytics'),
]

