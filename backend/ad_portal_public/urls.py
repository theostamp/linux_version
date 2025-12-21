from django.urls import path

from .views import StripeWebhookView


urlpatterns = [
    path("stripe/", StripeWebhookView.as_view(), name="ad-portal-stripe-webhook"),
    path("stripe", StripeWebhookView.as_view(), name="ad-portal-stripe-webhook-no-slash"),
]


