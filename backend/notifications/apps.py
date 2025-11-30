from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        """
        Register signals when the app is ready.
        """
        # Import and register event notification signals
        try:
            from .event_signals import register_event_signals
            register_event_signals()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not register event signals: {e}")
