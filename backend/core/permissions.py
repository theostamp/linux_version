# backend/core/permissions.py

from rest_framework import permissions 

class IsBuildingAdmin(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση σε:
    - Superusers
    - Staff users
    - Χρήστες με role='admin'
    """
    def has_permission(self, request, view):
        user = request.user
        return (
            user and user.is_authenticated and (
                user.is_superuser or
                user.is_staff or
                getattr(user, 'role', '') == 'admin'
            )
        )

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

class IsManagerOrSuperuser(permissions.BasePermission):
    """
    Επιτρέπει την πρόσβαση σε:
    - Superusers
    - Staff users
    - Χρήστες με role == 'manager'
    """
    def has_permission(self, request, view):
        user = request.user
        return (
            user and user.is_authenticated and (
                user.is_superuser or
                user.is_staff or
                getattr(user, 'role', '') == 'manager'
            )
        )

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if user.is_staff or getattr(user, 'role', '') == 'manager':
            # For global objects (building=null), staff users have permission
            if hasattr(obj, 'building') and obj.building is None:
                return True
            
            # Αν το αντικείμενο έχει manager που είναι ο ίδιος ο χρήστης
            if hasattr(obj, 'manager') and obj.manager == user:
                return True
            # Αν το αντικείμενο έχει building με manager τον χρήστη
            if hasattr(obj, 'building') and obj.building and hasattr(obj.building, 'manager') and obj.building.manager == user:
                return True

        return False



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
