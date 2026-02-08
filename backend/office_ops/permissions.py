from rest_framework.permissions import BasePermission


class IsOfficeOpsStaff(BasePermission):
    """
    Access policy for Office Operations APIs.

    Allowed:
    - superuser
    - manager
    - office staff with can_access_office_finance permission
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        role = getattr(user, "role", None)

        if role == "manager":
            return True

        if role in {"staff", "office_staff"}:
            permissions = getattr(user, "staff_permissions", None)
            if permissions and getattr(permissions, "is_active", False):
                return bool(getattr(permissions, "can_access_office_finance", False))
        return False
