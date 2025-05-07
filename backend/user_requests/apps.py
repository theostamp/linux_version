# backend/user_requests/apps.py

from django.apps import AppConfig

class UserRequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_requests'

    def ready(self):
        import user_requests.signals
        # Εδώ μπορείς να κάνεις import και άλλες συναρτήσεις ή να εκτελέσεις κώδικα που χρειάζεται να τρέξει όταν φορτώνει το app.
        # Για παράδειγμα, αν έχεις custom signals ή tasks που θέλεις να εκτελούνται κατά την εκκίνηση του app.