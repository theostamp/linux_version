# backend/core/permissions.py

from rest_framework.permissions import BasePermission
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class IsInternalService(BasePermission):
    """
    Custom permission class for internal API endpoints.
    
    This permission checks for the presence of a specific HTTP header
    (X-Internal-API-Key) and validates it against a secret key stored
    in environment variables.
    
    Usage:
        Add this permission to any view that should only be accessible
        by internal services (like the Public App):
        
        permission_classes = [IsInternalService]
    """
    
    def has_permission(self, request, view):
        """
        Check if the request has the correct internal API key.
        
        Returns:
            bool: True if the request has valid internal API key, False otherwise
        """
        # Get the internal API key from the request headers
        internal_api_key = request.META.get('HTTP_X_INTERNAL_API_KEY')
        
        # Get the expected secret key from environment variables
        expected_secret_key = getattr(settings, 'INTERNAL_API_SECRET_KEY', None)
        
        # If no secret key is configured, deny access
        if not expected_secret_key:
            logger.error("INTERNAL_API_SECRET_KEY not configured in settings")
            return False
        
        # If no API key is provided in the request, deny access
        if not internal_api_key:
            logger.warning(f"Internal API request without X-Internal-API-Key header from {request.META.get('REMOTE_ADDR', 'unknown')}")
            return False
        
        # Compare the provided key with the expected secret key
        is_valid = internal_api_key == expected_secret_key
        
        if not is_valid:
            logger.warning(f"Invalid internal API key provided from {request.META.get('REMOTE_ADDR', 'unknown')}")
        
        return is_valid
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For internal services, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsManagerOrSuperuser(BasePermission):
    """
    Custom permission class for manager and superuser access.
    
    Allows access only to managers and superusers.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is a manager or superuser.
        
        Returns:
            bool: True if user is manager or superuser, False otherwise
        """
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'manager' or request.user.is_superuser)
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For managers and superusers, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsBuildingAdmin(BasePermission):
    """
    Custom permission class for building admin access.
    
    Allows access only to building administrators.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is a building admin.
        
        Returns:
            bool: True if user is building admin, False otherwise
        """
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'building_admin' or request.user.is_superuser)
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check.
        
        For building admins, we use the same permission logic
        as the general permission check.
        """
        return self.has_permission(request, view)


class IsManager(BasePermission):
    """
    Custom permission class for manager access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'manager'
        )


class IsResident(BasePermission):
    """
    Custom permission class for resident access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'resident'
        )


class IsRelatedToBuilding(BasePermission):
    """
    Custom permission class for users related to a building.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['manager', 'resident', 'building_admin'] or request.user.is_superuser)
        )


class IsSuperuser(BasePermission):
    """
    Custom permission class for superuser access.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_superuser
        )