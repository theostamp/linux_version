# billing/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionPlanViewSet, UserSubscriptionViewSet,
    PaymentMethodViewSet, UsageTrackingViewSet,
    BillingCycleViewSet,
    CreatePaymentIntentView, UsageAnalyticsView,
    UsageTrendsView, PlanComparisonView,
    BillingHistoryView, AdminUsageStatsView,
    InvoiceManagementView, PaymentProcessingView,
    AdminBillingManagementView, AdminDashboardView,
    AdminUserManagementView, AdminSubscriptionManagementView,
    AdminSystemHealthView, AdvancedAnalyticsView,
    RevenueAnalyticsView, CustomerAnalyticsView,
    SubscriptionAnalyticsView, UsageAnalyticsView as AdvancedUsageAnalyticsView,
    PaymentAnalyticsView, PredictiveAnalyticsView,
    CreateCheckoutSessionView, SubscriptionStatusView
)
from .webhooks import StripeWebhookView, PaymentVerificationView

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
    path('webhook/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    
    # Payment verification
    path('verify-payment/', PaymentVerificationView.as_view(), name='verify-payment'),
    
    # Payment intent
    path('payment-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    
    # Stripe Checkout Session (with and without trailing slash for compatibility)
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('create-checkout-session', CreateCheckoutSessionView.as_view(), name='create-checkout-session-no-slash'),
    path('subscription-status/<str:session_id>/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('subscription-status/<str:session_id>', SubscriptionStatusView.as_view(), name='subscription-status-no-slash'),
    
    # Usage Analytics
    path('analytics/usage/', UsageAnalyticsView.as_view(), name='usage-analytics'),
    path('analytics/trends/', UsageTrendsView.as_view(), name='usage-trends'),
    path('analytics/plan-comparison/', PlanComparisonView.as_view(), name='plan-comparison'),
    path('analytics/billing-history/', BillingHistoryView.as_view(), name='billing-history'),
    
    # Admin Analytics
    path('admin/usage-stats/', AdminUsageStatsView.as_view(), name='admin-usage-stats'),
    
    # Invoice Management
    path('invoices/', InvoiceManagementView.as_view(), name='invoice-management'),
    path('payments/process/', PaymentProcessingView.as_view(), name='payment-processing'),
    
    # Admin Billing Management
    path('admin/billing/', AdminBillingManagementView.as_view(), name='admin-billing-management'),
    
    # Admin Dashboard
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/users/', AdminUserManagementView.as_view(), name='admin-user-management'),
    path('admin/subscriptions/', AdminSubscriptionManagementView.as_view(), name='admin-subscription-management'),
    path('admin/system-health/', AdminSystemHealthView.as_view(), name='admin-system-health'),
    
    # Advanced Analytics
    path('analytics/advanced/', AdvancedAnalyticsView.as_view(), name='advanced-analytics'),
    path('analytics/revenue/', RevenueAnalyticsView.as_view(), name='revenue-analytics'),
    path('analytics/customers/', CustomerAnalyticsView.as_view(), name='customer-analytics'),
    path('analytics/subscriptions/', SubscriptionAnalyticsView.as_view(), name='subscription-analytics'),
    path('analytics/usage-advanced/', AdvancedUsageAnalyticsView.as_view(), name='usage-analytics-advanced'),
    path('analytics/payments/', PaymentAnalyticsView.as_view(), name='payment-analytics'),
    path('analytics/predictive/', PredictiveAnalyticsView.as_view(), name='predictive-analytics'),
]

