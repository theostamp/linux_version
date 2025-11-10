# backend\votes\apps.py
from django.apps import AppConfig


class VotesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'votes'

    def ready(self):
        """Import signal handlers when app is ready."""
        import votes.signals  # noqa: F401
