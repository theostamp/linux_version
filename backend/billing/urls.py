# billing/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionPlanViewSet, UserSubscriptionViewSet,
    PaymentMethodViewSet, UsageTrackingViewSet,
    BillingCycleViewSet, StripeWebhookView,
    CreatePaymentIntentView, UsageAnalyticsView,
    UsageTrendsView, PlanComparisonView,
    BillingHistoryView, AdminUsageStatsView
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
    path('api/', include(router.urls)),
    
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
]

