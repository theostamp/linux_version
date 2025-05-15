# backend/core/permissions.py

from rest_framework import permissions



class IsResidentOrSuperuser(permissions.BasePermission):
    """
    Επιτρέπει μόνο σε superusers ή σε authenticated users που **δεν** είναι staff (δηλαδή κατοίκους).
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or not user.is_staff))


class IsManagerOrSuperuser(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        if hasattr(obj, 'manager'):
            return obj.manager == user
        if hasattr(obj, 'building') and hasattr(obj.building, 'manager'):
            return obj.building.manager == user
        return False

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))
