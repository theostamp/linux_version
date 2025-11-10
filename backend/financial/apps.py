from django.apps import AppConfig


class FinancialConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'financial'
    
    def ready(self):
        """Εγγραφή signals όταν φορτώνει το app"""
        import financial.signals  # Φόρτωση signals
