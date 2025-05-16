# backend/core/permissions.py

from rest_framework import permissions
# from user_requests.models import UserRequest # Προαιρετικά, για type hinting
# from buildings.models import Building # Προαιρετικά, για type hinting
# from django.contrib.auth import get_user_model # Προαιρετικά, για type hinting
# User = get_user_model()


class IsSuperuser(permissions.BasePermission):
    """Allows access only to superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class IsStaffUser(permissions.BasePermission): # Αυτή η κλάση επιτρέπει σε όλους τους staff
    """Allows access only to staff users (managers)."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class IsResidentUser(permissions.BasePermission):
    """Allows access only to non-staff authenticated users (residents)."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and not request.user.is_staff

# --- ΠΡΟΣΘΕΣΤΕ ΤΗΝ ΠΑΡΑΚΑΤΩ ΚΛΑΣΗ ΑΝ ΔΕΝ ΥΠΑΡΧΕΙ ---
class IsManagerOrSuperuser(permissions.BasePermission):
    """
    Επιτρέπει την πρόσβαση μόνο σε superusers ή σε αυθεντικοποιημένους χρήστες που ΕΙΝΑΙ staff (δηλαδή "Manager Office").
    Επίσης, χειρίζεται object-level permissions για να επιτρέψει στους managers να επεξεργάζονται
    αντικείμενα που σχετίζονται με τις πολυκατοικίες που διαχειρίζονται.
    """
    def has_permission(self, request, view):
        # Έλεγχος σε επίπεδο View: επιτρέπεται αν ο χρήστης είναι superuser ή staff.
        return request.user and request.user.is_authenticated and \
               (request.user.is_superuser or request.user.is_staff)

    def has_object_permission(self, request, view, obj):
        # Έλεγχος σε επίπεδο Object:
        # Οι Superusers έχουν πάντα δικαίωμα.
        if request.user.is_superuser:
            return True
        
        # Οι Staff users (Managers Office) έχουν δικαίωμα αν το αντικείμενο
        # σχετίζεται με κτίριο που διαχειρίζονται.
        if request.user.is_staff:
            # Αν το ίδιο το αντικείμενο έχει πεδίο 'manager' (π.χ., ένα Building object)
            if hasattr(obj, 'manager') and obj.manager == request.user:
                return True
            # Αν το αντικείμενο έχει πεδίο 'building' και αυτό το building έχει manager
            # (π.χ., UserRequest, Announcement, Vote που ανήκουν σε ένα Building)
            if hasattr(obj, 'building') and hasattr(obj.building, 'manager') and obj.building.manager == request.user:
                return True
            # Αν δεν υπάρχει σαφής σύνδεση διαχείρισης για αυτό το αντικείμενο,
            # αλλά ο χρήστης είναι staff, θα μπορούσαμε να του επιτρέψουμε την πρόσβαση
            # αν η has_permission ήταν αρκετή (π.χ., για list views που δεν φιλτράρονται εδώ).
            # Για object-level, πρέπει να είναι πιο συγκεκριμένο.
            # Αν δεν βρεθεί κάποια από τις παραπάνω συνθήκες, ο staff δεν έχει object permission by default εδώ.
            # Ίσως θέλετε οι staff να έχουν πάντα object permission αν έχουν view permission.
            # return True # Αυτό θα έδινε σε όλους τους staff πλήρη object permission αν πέρασαν το has_permission.
                         # Πιο ασφαλές είναι να είναι ρητό.

        return False # Απόρριψη για άλλες περιπτώσεις (π.χ. resident που προσπαθεί σε αντικείμενο άλλου)

class UserRequestOwnerOrManagerPermission(permissions.BasePermission):
    """
    Permission για UserRequests:
    - Για list views (has_permission), αρκεί να είναι αυθεντικοποιημένος.
    - Για object-level:
        - Ο κάτοικος που δημιούργησε το αίτημα μπορεί να το δει/επεξεργαστεί.
        - Ο manager της πολυκατοικίας του αιτήματος μπορεί να το δει/επεξεργαστεί.
        - Superusers μπορούν να κάνουν τα πάντα.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj): # obj είναι ένα UserRequest instance
        if not request.user.is_authenticated: # Παρόλο που το has_permission θα το έπιανε
            return False

        if request.user.is_superuser:
            return True

        # Ο manager της πολυκατοικίας του αιτήματος έχει δικαιώματα (είναι staff).
        if request.user.is_staff:
            if hasattr(obj, 'building') and obj.building and hasattr(obj.building, 'manager') and obj.building.manager == request.user:
                return True
        
        # Ο κάτοικος που δημιούργησε το αίτημα έχει δικαιώματα (δεν είναι staff).
        if not request.user.is_staff and hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
            
        # Προαιρετικά: Επιτρέψτε στους κατοίκους να βλέπουν (SAFE_METHODS) αιτήματα της πολυκατοικίας τους
        # if request.method in permissions.SAFE_METHODS and not request.user.is_staff:
        #     # if user_is_member_of_building(request.user, obj.building):
        #     #     return True
        #     pass # Χρειάζεται λογική για το user_is_member_of_building

        return False
