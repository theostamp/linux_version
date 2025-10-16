# billing/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    SubscriptionPlanViewSet, UserSubscriptionViewSet,
    PaymentMethodViewSet, UsageTrackingViewSet,
    BillingCycleViewSet, StripeWebhookView,
    CreatePaymentIntentView
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
]
