from django.apps import AppConfig


class OnlinePaymentsPublicConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "online_payments_public"
    verbose_name = "Online Payments (Public Webhooks)"


