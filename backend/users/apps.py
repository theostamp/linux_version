from django.apps import AppConfig  
      # type: ignore


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    
    def ready(self):
        import users.signals  # Εγγραφή των signals
