from django.urls import path

from .views import StripeWebhookView


urlpatterns = [
    # Stripe webhooks for online payments (charges)
    path("stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("stripe", StripeWebhookView.as_view(), name="stripe-webhook-no-slash"),
]


