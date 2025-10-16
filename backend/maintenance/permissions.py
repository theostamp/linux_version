from rest_framework import permissions
from core.permissions import IsManager, IsResident, IsRelatedToBuilding


class MaintenancePermission(permissions.BasePermission):
    """
    Maintenance permissions με RBAC integration
    
    - Ανάγνωση: Managers, Residents (μόνο για τα κτίριά τους)
    - Δημιουργία: Managers, Residents (μόνο για τα κτίριά τους)
    - Επεξεργασία/Διαγραφή: Μόνο Managers
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

        # RBAC: Ανάγνωση και Δημιουργία - Managers και Residents
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            return (user.groups.filter(name='Manager').exists() or 
                   user.groups.filter(name='Resident').exists())

        # RBAC: Επεξεργασία/Διαγραφή - Μόνο Managers
        elif request.method in ['PUT', 'PATCH', 'DELETE']:
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

        # RBAC: Ανάγνωση και Δημιουργία - Managers και Residents (μόνο για τα κτίριά τους)
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            is_manager = user.groups.filter(name='Manager').exists()
            is_resident = user.groups.filter(name='Resident').exists()
            
            if is_manager:
                return True  # Managers βλέπουν όλα
            elif is_resident:
                # Residents βλέπουν μόνο τα κτίριά τους
                return IsRelatedToBuilding().has_object_permission(request, view, obj)

        # RBAC: Επεξεργασία/Διαγραφή - Μόνο Managers
        elif request.method in ['PUT', 'PATCH', 'DELETE']:
            return user.groups.filter(name='Manager').exists()

        # Legacy fallback
        return self.has_permission(request, view)


