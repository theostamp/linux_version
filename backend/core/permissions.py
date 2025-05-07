# backend/core/permissions.py

from rest_framework import permissions

class IsManagerOrSuperuser(permissions.BasePermission):
    """
    Επιτρέπει την πρόσβαση σε superusers ή χρήστες που είναι manager του αντικειμένου.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.is_superuser:
            return True

        # Για Building αντικείμενα
        if hasattr(obj, 'manager'):
            return obj.manager == user

        # Για Tenant ή Announcement αντικείμενα που συνδέονται με Building
        if hasattr(obj, 'building') and hasattr(obj.building, 'manager'):
            return obj.building.manager == user

        return False
