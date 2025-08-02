# backend/buildings/permissions.py

from rest_framework import permissions
from buildings.models import BuildingMembership


class IsOfficeManager(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση μόνο σε Office Managers (δηλ. staff χρήστες του tenant).
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_office_manager


class IsSuperuserOrOfficeManager(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση είτε σε superuser είτε σε office manager του tenant.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or request.user.is_office_manager
        )


class IsResidentOfBuilding(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση μόνο σε κατοίκους της πολυκατοικίας.
    Το view πρέπει να καλεί get_object() που επιστρέφει Building.
    """
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.is_resident_of(obj)


class IsRepresentativeOfBuilding(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση μόνο σε εκπρόσωπο της πολυκατοικίας.
    """
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.is_representative_of(obj)


class IsSuperuserOrRepresentative(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση είτε σε superuser είτε σε εκπρόσωπο πολυκατοικίας.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        return user.is_authenticated and (
            user.is_superuser or user.is_representative_of(obj)
        )

class IsManagerOfBuilding(permissions.BasePermission):
    """
    Επιτρέπει πρόσβαση μόνο στον manager του συγκεκριμένου κτιρίου.
    """
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.is_manager_of(obj)
