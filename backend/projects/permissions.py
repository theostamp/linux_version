from rest_framework import permissions


class ProjectPermission(permissions.BasePermission):
    """Read allowed to authenticated; write allowed to managers/admins."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return bool(
            getattr(user, "is_superuser", False)
            or getattr(user, "is_staff", False)
            or getattr(user, "role", "") in {"admin", "manager"}
        )

    def has_object_permission(self, request, view, obj):
        # Same as has_permission for now; could add building-scoped checks here
        return self.has_permission(request, view)


