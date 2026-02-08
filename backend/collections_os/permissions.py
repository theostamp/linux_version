from rest_framework.permissions import BasePermission


class IsCollectionsOperator(BasePermission):
    """
    Access policy for Collections OS endpoints.
    Allowed:
    - superuser
    - manager
    - staff
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff or getattr(user, "is_office_manager", False):
            return True
        role = getattr(user, "role", None)
        return role in {"manager", "staff", "admin"}
