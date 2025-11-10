from django.apps import AppConfig


class AnnouncementsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'announcements'

    def ready(self):
        """Import signal handlers when app is ready."""
        import announcements.signals  # noqa: F401
