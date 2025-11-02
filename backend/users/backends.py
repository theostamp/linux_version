from django.contrib.auth.backends import ModelBackend      
from django.contrib.auth import get_user_model      

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Επιτρέπει authenticate με email ή username.
    Λειτουργεί και με Django admin.
    
    Supports:
    - authenticate(request, username='user@email.com', password='...')
    - authenticate(request, username='theo-eth', password='...')
    - authenticate(request, email='user@email.com', password='...')
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Παίρνουμε email/username από kwargs ή από username parameter
        identifier = kwargs.get('email') or username
        if identifier is None or password is None:
            print(f"[EmailBackend] Missing identifier or password: identifier={identifier}, password={'****' if password else None}")
            return None

        print(f"[EmailBackend] Attempting authentication for: {identifier}")
        
        # Try to find user by email first
        user = None
        try:
            user = User.objects.get(email__iexact=identifier)
            print(f"[EmailBackend] User found by email: {user.email}, is_active: {user.is_active}")
        except User.DoesNotExist:
            # If not found by email, try username
            try:
                user = User.objects.get(username__iexact=identifier)
                print(f"[EmailBackend] User found by username: {user.username}, is_active: {user.is_active}")
            except User.DoesNotExist:
                print(f"[EmailBackend] User not found for identifier: {identifier}")
                return None
            except Exception as e:
                # Username field might not exist yet (during migration)
                print(f"[EmailBackend] Username lookup failed (field may not exist): {e}")
                return None

        # Ελέγχουμε password
        password_valid = user.check_password(password)
        can_authenticate = self.user_can_authenticate(user)
        print(f"[EmailBackend] Password valid: {password_valid}, can_authenticate: {can_authenticate}")
        
        if password_valid and can_authenticate:
            print(f"[EmailBackend] Authentication successful for user: {user.email}")
            return user
        
        print(f"[EmailBackend] Authentication failed for user: {user.email}")
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