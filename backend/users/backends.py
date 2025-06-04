from django.contrib.auth.backends import ModelBackend      
from django.contrib.auth import get_user_model      

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Επιτρέπει authenticate(request, email=…, password=…)
    αντί για username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Παίρνουμε email από kwargs ή από username
        email = kwargs.get('email') or username
        if email is None or password is None:
            return None

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return None

        # Ελέγχουμε password
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
