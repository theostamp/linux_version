# billing/apps.py

from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'
    verbose_name = 'Billing & Subscriptions'
    
    def ready(self):
        """Import signal handlers when app is ready"""
        try:
            import billing.signals
        except ImportError:
            pass



