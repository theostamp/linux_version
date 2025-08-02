# votes/permissions.py

from rest_framework.permissions import BasePermission

class IsBuildingAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        return request.user and obj.building in request.user.buildings.all()
