# backend/core/permissions.py

from rest_framework import permissions 

# ===== RBAC PERMISSION CLASSES =====

class IsManager(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση σε χρήστες που ανήκουν στο 'Manager' group.
    Επίσης επιτρέπει σε superusers και staff users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers και staff έχουν πάντα πρόσβαση
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Έλεγχος αν ο χρήστης ανήκει στο Manager group
        return request.user.groups.filter(name='Manager').exists()


class IsResident(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση σε χρήστες που ανήκουν στο 'Resident' group.
    Επίσης επιτρέπει σε superusers και staff users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers και staff έχουν πάντα πρόσβαση
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Έλεγχος αν ο χρήστης ανήκει στο Resident group
        return request.user.groups.filter(name='Resident').exists()


class IsRelatedToBuilding(permissions.BasePermission):
    """
    Object-level permission για να επιτρέπει σε χρήστες να βλέπουν μόνο αντικείμενα
    που σχετίζονται με κτίρια στα οποία έχουν membership.
    Χρησιμοποιεί το BuildingMembership model για να καθορίσει τη σχέση.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers και staff έχουν πρόσβαση σε όλα
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Λήψη των building IDs που σχετίζονται με τον χρήστη
        user_building_ids = request.user.memberships.values_list('building_id', flat=True)
        
        if not user_building_ids:
            return False
        
        # Έλεγχος άμεσης σχέσης με building
        if hasattr(obj, 'building') and obj.building:
            return obj.building.id in user_building_ids
        
        # Έλεγχος έμμεσης σχέσης (π.χ. μέσω apartment)
        if hasattr(obj, 'apartment') and hasattr(obj.apartment, 'building') and obj.apartment.building:
            return obj.apartment.building.id in user_building_ids
        
        # Αν το αντικείμενο είναι το ίδιο το building
        if hasattr(obj, 'id') and obj.id in user_building_ids:
            return True
        
        # Αν το αντικείμενο είναι apartment
        if hasattr(obj, 'building') and hasattr(obj.building, 'id'):
            return obj.building.id in user_building_ids
        
        return False


# ===== LEGACY PERMISSION CLASSES (Κρατώνται για backward compatibility) =====

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
        if not (request.user and request.user.is_authenticated and request.user.is_superuser):
            return False
        
        # Επιπλέον έλεγχος email verification για superusers
        if not request.user.email_verified:
            print(f"SECURITY WARNING: Unverified superuser {request.user.email} attempted access")
            return False
        
        return True

class IsStaffUser(permissions.BasePermission): # Αυτή η κλάση επιτρέπει σε όλους τους staff
    """Allows access only to staff users (managers)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            return False
        
        # Επιπλέον έλεγχος email verification για staff users
        if not request.user.email_verified:
            print(f"SECURITY WARNING: Unverified staff user {request.user.email} attempted access")
            return False
        
        return True

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
