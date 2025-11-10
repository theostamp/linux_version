from django.contrib.auth.backends import ModelBackend      
from django.contrib.auth import get_user_model      

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Επιτρέπει authenticate(request, email=…, password=…)
    αντί για username. Λειτουργεί και με Django admin.
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
    
    def get_user(self, user_id):
        """Required for Django admin compatibility"""
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    
    def user_can_authenticate(self, user):
        """
        Custom implementation που ελέγχει email_verified για admin users.
        """
        # Βασικός έλεγχος από το Django
        if not super().user_can_authenticate(user):
            return False
        
        # Έλεγχος email verification για admin users
        if user.is_superuser or user.is_staff:
            if not user.email_verified:
                print(f"SECURITY WARNING: Unverified admin user {user.email} attempted login")
                return False
        
        return True