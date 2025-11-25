from rest_framework import permissions
from core.permissions import IsManager, IsResident, IsRelatedToBuilding


class MaintenancePermission(permissions.BasePermission):
    """
    Maintenance permissions με RBAC integration και νέο role-based system
    
    - Ανάγνωση: Office Managers, Internal Managers, Residents (μόνο για τα κτίριά τους)
    - Δημιουργία: Office Managers, Internal Managers, Residents (μόνο για τα κτίριά τους)
    - Επεξεργασία/Διαγραφή: Μόνο Office Managers
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True

        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True

        # Ανάγνωση και Δημιουργία - Managers, Office Managers, Internal Managers και Residents
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            # Office Managers και Internal Managers
            if (getattr(user, 'is_office_manager', False) or 
                getattr(user, 'is_internal_manager', False)):
                return True
            # Residents (νέο role-based system)
            if (getattr(user, 'is_resident_role', False) or 
                getattr(user, 'role', '') == 'resident'):
                return True
            # RBAC groups fallback
            return (user.groups.filter(name='Manager').exists() or 
                   user.groups.filter(name='Resident').exists())

        # Επεξεργασία/Διαγραφή - Μόνο Office Managers (όχι Internal Managers ή Residents)
        elif request.method in ['PUT', 'PATCH', 'DELETE']:
            # Office Managers
            if getattr(user, 'is_office_manager', False):
                return True
            # RBAC groups fallback
            return user.groups.filter(name='Manager').exists()

        # Legacy fallback
        return bool(
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or getattr(user, "role", "") in {"admin", "manager"}
        )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Superusers έχουν πλήρη πρόσβαση
        if user.is_superuser:
            return True

        # Staff users έχουν πλήρη πρόσβαση
        if user.is_staff:
            return True

        # Ανάγνωση και Δημιουργία - Managers, Office Managers, Internal Managers και Residents
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            # Office Managers βλέπουν όλα
            if getattr(user, 'is_office_manager', False):
                return True
            
            # Internal Managers βλέπουν μόνο τη δική τους πολυκατοικία
            if getattr(user, 'is_internal_manager', False):
                building = getattr(obj, 'building', None)
                if building:
                    return user.is_internal_manager_of(building)
                return True  # Θα ελεγχθεί σε object level
            
            # Residents βλέπουν μόνο τα κτίριά τους
            if (getattr(user, 'is_resident_role', False) or 
                getattr(user, 'role', '') == 'resident'):
                return IsRelatedToBuilding().has_object_permission(request, view, obj)
            
            # RBAC groups fallback
            is_manager = user.groups.filter(name='Manager').exists()
            is_resident = user.groups.filter(name='Resident').exists()
            
            if is_manager:
                return True  # Managers βλέπουν όλα
            elif is_resident:
                # Residents βλέπουν μόνο τα κτίριά τους
                return IsRelatedToBuilding().has_object_permission(request, view, obj)

        # Επεξεργασία/Διαγραφή - Μόνο Office Managers (όχι Internal Managers ή Residents)
        elif request.method in ['PUT', 'PATCH', 'DELETE']:
            # Office Managers
            if getattr(user, 'is_office_manager', False):
                return True
            # RBAC groups fallback
            return user.groups.filter(name='Manager').exists()

        # Legacy fallback
        return self.has_permission(request, view)


