from rest_framework import permissions

class IsBuildingAdmin(permissions.BasePermission):
    """
    Επιτρέπει την πρόσβαση μόνο σε superusers ή office managers (δηλ. is_staff).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_superuser
                or request.user.is_staff  # Office Manager
            )
        )
