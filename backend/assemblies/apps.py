from django.apps import AppConfig


class AssembliesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'assemblies'
    verbose_name = 'Γενικές Συνελεύσεις'

    def ready(self):
        # Import signals when app is ready
        try:
            import assemblies.signals  # noqa
        except ImportError:
            pass
