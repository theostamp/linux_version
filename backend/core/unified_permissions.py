# backend/core/unified_permissions.py

from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Group
from users.role_management import RoleManager
import logging

logger = logging.getLogger(__name__)


class UnifiedPermissionMixin:
    """
    Mixin that provides unified permission checking across the system.
    Uses both Django Groups and custom role field for maximum compatibility.
    """
    
    def has_role_permission(self, user, required_role, building=None):
        """
        Check if user has the required role with proper hierarchy validation.
        
        Args:
            user: CustomUser instance
            required_role: Required role name
            building: Building instance (for building-specific checks)
        """
        if not user or not user.is_authenticated:
            return False
        
        # Superusers have all permissions
        if user.is_superuser:
            return True
        
        # Check role hierarchy
        user_level = RoleManager.ROLE_HIERARCHY.get(user.role, 0)
        required_level = RoleManager.ROLE_HIERARCHY.get(required_role, 0)
        
        # User must have equal or higher level
        if user_level >= required_level:
            return True
        
        # Check Django Groups as fallback
        if required_role == 'manager' and user.groups.filter(name='Manager').exists():
            return True
        if required_role == 'resident' and user.groups.filter(name='Resident').exists():
            return True
        
        return False
    
    def has_specific_permission(self, user, permission, building=None):
        """
        Check if user has a specific permission.
        
        Args:
            user: CustomUser instance
            permission: Permission to check
            building: Building instance (for building-specific checks)
        """
        if not user or not user.is_authenticated:
            return False
        
        # Use RoleManager for permission checking
        return RoleManager.has_permission(user, permission)


class IsUltraUser(BasePermission, UnifiedPermissionMixin):
    """
    Permission for ultra superuser (theostam1966@gmail.com).
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return (user.is_superuser and 
                user.email == 'theostam1966@gmail.com' and
                user.role in ['admin', 'superuser'])


class IsManagerOrHigher(BasePermission, UnifiedPermissionMixin):
    """
    Permission for managers and higher roles.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_role_permission(user, 'manager')


class IsStaffOrHigher(BasePermission, UnifiedPermissionMixin):
    """
    Permission for staff and higher roles.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_role_permission(user, 'staff')


class IsResidentOrHigher(BasePermission, UnifiedPermissionMixin):
    """
    Permission for residents and higher roles.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_role_permission(user, 'resident')


class CanManageUsers(BasePermission, UnifiedPermissionMixin):
    """
    Permission for users who can manage other users.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Ultra users and admins can manage all users
        if user.is_superuser or user.role in ['admin', 'superuser']:
            return True
        
        # Managers can manage residents
        if user.role == 'manager' or user.groups.filter(name='Manager').exists():
            return True
        
        return False


class CanManageFinancials(BasePermission, UnifiedPermissionMixin):
    """
    Permission for financial management operations.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_specific_permission(user, 'can_manage_financials')


class CanViewAnalytics(BasePermission, UnifiedPermissionMixin):
    """
    Permission for viewing analytics and reports.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_specific_permission(user, 'can_view_analytics')


class CanInviteUsers(BasePermission, UnifiedPermissionMixin):
    """
    Permission for inviting new users.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        return self.has_specific_permission(user, 'can_invite_residents')


class BuildingScopedPermission(BasePermission, UnifiedPermissionMixin):
    """
    Permission that checks both role and building access.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Get building from request
        building = getattr(request, 'building', None)
        if not building:
            # Try to get from view
            building = getattr(view, 'building', None)
        
        # Superusers have access to all buildings
        if user.is_superuser:
            return True
        
        # Check if user has access to this building
        if building:
            # Check if user is manager of this building
            if hasattr(building, 'manager') and building.manager == user:
                return True
            
            # Check if user is resident of this building
            if hasattr(user, 'memberships'):
                return user.memberships.filter(building=building).exists()
        
        return False


class ReadOnlyPermission(BasePermission, UnifiedPermissionMixin):
    """
    Permission for read-only access.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Allow read operations for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Write operations require higher permissions
        return self.has_role_permission(user, 'manager')


class WritePermission(BasePermission, UnifiedPermissionMixin):
    """
    Permission for write operations.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Only managers and higher can write
        return self.has_role_permission(user, 'manager')


class AdminPermission(BasePermission, UnifiedPermissionMixin):
    """
    Permission for admin operations.
    """
    
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        # Only admins and superusers can perform admin operations
        return (user.is_superuser or 
                user.role in ['admin', 'superuser'] or
                user.groups.filter(name='Manager').exists())


def get_user_effective_role(user):
    """
    Get the effective role of a user considering both role field and groups.
    
    Args:
        user: CustomUser instance
        
    Returns:
        str: Effective role name
    """
    if not user or not user.is_authenticated:
        return 'guest'
    
    # Superusers are always superuser
    if user.is_superuser:
        return 'superuser'
    
    # Check role field first
    if user.role and user.role in RoleManager.ROLE_DEFINITIONS:
        return user.role
    
    # Fallback to group-based role
    if user.groups.filter(name='Manager').exists():
        return 'manager'
    elif user.groups.filter(name='Resident').exists():
        return 'resident'
    
    # Default for authenticated users
    return 'resident'


def get_user_permissions_summary(user):
    """
    Get a summary of user's permissions for debugging.
    
    Args:
        user: CustomUser instance
        
    Returns:
        dict: Permission summary
    """
    if not user or not user.is_authenticated:
        return {'role': 'guest', 'permissions': {}}
    
    effective_role = get_user_effective_role(user)
    permissions = RoleManager.get_user_permissions(user)
    
    return {
        'role': effective_role,
        'role_field': getattr(user, 'role', None),
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'groups': list(user.groups.values_list('name', flat=True)),
        'permissions': permissions,
    }





