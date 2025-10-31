# backend/users/role_management.py

from django.contrib.auth.models import Group
from django.db import transaction
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)


class SystemRoleManager:
    """
    System-level role management for CustomUser (SystemRole).
    
    Handles only system roles: 'superuser', 'admin', 'manager'
    These are Django tenant-level roles stored in CustomUser.role.
    
    For apartment-level roles (manager, owner, tenant), see ResidentRoleManager.
    """
    
    # Valid SystemRole values (from CustomUser.SystemRole enum)
    VALID_SYSTEM_ROLES = ['superuser', 'admin', 'manager']
    
    # Role hierarchy (higher number = more permissions)
    ROLE_HIERARCHY = {
        'superuser': 100,
        'admin': 90,  # Same level as superuser (backward compat)
        'manager': 80,
    }
    
    # Role definitions with permissions
    ROLE_DEFINITIONS = {
        'superuser': {
            'name': 'Ultra Admin',
            'description': 'Complete system administration access (public + all tenant schemas)',
            'permissions': {
                'can_manage_all_tenants': True,
                'can_manage_all_users': True,
                'can_access_all_buildings': True,
                'can_manage_billing': True,
                'can_view_analytics': True,
                'can_manage_system_settings': True,
            },
            'django_groups': [],
            'is_superuser': True,
            'is_staff': True,
        },
        'admin': {
            'name': 'Ultra Admin (backward compat)',
            'description': 'Complete system administration access (same as superuser, backward compat)',
            'permissions': {
                'can_manage_all_tenants': True,
                'can_manage_all_users': True,
                'can_access_all_buildings': True,
                'can_manage_billing': True,
                'can_view_analytics': True,
                'can_manage_system_settings': True,
            },
            'django_groups': [],
            'is_superuser': True,
            'is_staff': True,
        },
        'manager': {
            'name': 'Office Manager (Django Tenant Owner)',
            'description': 'Django Tenant Owner: access only to own tenant schema',
            'permissions': {
                'can_manage_tenant_users': True,
                'can_manage_tenant_buildings': True,
                'can_access_tenant_analytics': True,
                'can_manage_tenant_billing': True,
                'can_invite_users': True,
                'can_manage_buildings': True,
                'can_invite_residents': True,
                'can_manage_financials': True,
                'can_view_building_analytics': True,
                'can_manage_maintenance': True,
            },
            'django_groups': ['Manager'],
            'is_superuser': False,
            'is_staff': True,
        },
    }
    
    @classmethod
    def assign_role(cls, user, role_name, building=None):
        """
        Assign a system role to a user with proper group membership and permissions.
        
        Args:
            user: CustomUser instance
            role_name: System role to assign ('superuser', 'admin', or 'manager')
            building: Building instance (ignored for system roles, kept for backward compat)
        
        Raises:
            ValueError: If role_name is not a valid SystemRole
        """
        # Validate that role_name is a valid SystemRole
        if role_name not in cls.VALID_SYSTEM_ROLES:
            # Check for common mistakes
            if role_name in ['tenant', 'owner', 'staff', 'resident']:
                raise ValueError(
                    f"'{role_name}' is not a valid SystemRole. "
                    f"Valid SystemRole values: {cls.VALID_SYSTEM_ROLES}. "
                    f"'{role_name}' is a Resident.Role value - use ResidentRoleManager instead."
                )
            raise ValueError(
                f"Invalid SystemRole: '{role_name}'. "
                f"Valid values: {cls.VALID_SYSTEM_ROLES}"
            )
        
        if role_name not in cls.ROLE_DEFINITIONS:
            raise ValueError(f"Role definition missing for: {role_name}")
        
        role_def = cls.ROLE_DEFINITIONS[role_name]
        
        with transaction.atomic():
            # Update user role and flags
            user.role = role_name
            user.is_superuser = role_def['is_superuser']
            user.is_staff = role_def['is_staff']
            user.save(update_fields=['role', 'is_superuser', 'is_staff'])
            
            # Clear existing groups
            user.groups.clear()
            
            # Add to appropriate Django groups
            for group_name in role_def['django_groups']:
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)
                if created:
                    logger.info(f"Created group: {group_name}")
            
            logger.info(f"Assigned role '{role_name}' to user {user.email}")
    
    @classmethod
    def get_user_permissions(cls, user):
        """
        Get effective permissions for a user based on their role.
        
        Args:
            user: CustomUser instance
            
        Returns:
            dict: User's effective permissions
        """
        if not user or not user.is_authenticated:
            return {}
        
        # Superusers have all permissions
        if user.is_superuser:
            return {perm: True for role_def in cls.ROLE_DEFINITIONS.values() 
                   for perm in role_def['permissions']}
        
        # Get role-specific permissions
        role_name = getattr(user, 'role', None)
        if role_name and role_name in cls.ROLE_DEFINITIONS:
            return cls.ROLE_DEFINITIONS[role_name]['permissions'].copy()
        
        # Default permissions for authenticated users
        return {
            'can_view_own_data': True,
            'can_manage_own_profile': True,
        }
    
    @classmethod
    def has_permission(cls, user, permission):
        """
        Check if user has a specific permission.
        
        Args:
            user: CustomUser instance
            permission: Permission to check
            
        Returns:
            bool: True if user has permission
        """
        user_permissions = cls.get_user_permissions(user)
        return user_permissions.get(permission, False)
    
    @classmethod
    def can_manage_user(cls, manager, target_user):
        """
        Check if manager can manage target user.
        
        Args:
            manager: User trying to manage
            target_user: User being managed
            
        Returns:
            bool: True if manager can manage target user
        """
        if not manager or not target_user:
            return False
        
        # Superusers can manage everyone
        if manager.is_superuser:
            return True
        
        # Users can't manage themselves
        if manager == target_user:
            return False
        
        # Get role hierarchy levels (only for system roles)
        manager_level = cls.ROLE_HIERARCHY.get(manager.role, 0)
        target_level = cls.ROLE_HIERARCHY.get(target_user.role, 0)
        
        # Manager must have higher level than target
        return manager_level > target_level
    
    @classmethod
    def get_role_hierarchy(cls):
        """
        Get role hierarchy for display purposes.
        
        Returns:
            list: Roles ordered by hierarchy (highest first)
        """
        return sorted(cls.ROLE_HIERARCHY.items(), 
                     key=lambda x: x[1], reverse=True)
    
    @classmethod
    def validate_role_assignment(cls, assigner, target_user, new_role):
        """
        Validate if assigner can assign new_role to target_user.
        
        Args:
            assigner: User trying to assign role
            target_user: User getting new role
            new_role: Role to assign
            
        Returns:
            tuple: (is_valid, error_message)
        """
        # Check if assigner can manage target user
        if not cls.can_manage_user(assigner, target_user):
            return False, "You don't have permission to manage this user"
        
        # Check if assigner can assign this role
        assigner_level = cls.ROLE_HIERARCHY.get(assigner.role, 0)
        new_role_level = cls.ROLE_HIERARCHY.get(new_role, 0)
        
        if assigner_level <= new_role_level:
            return False, f"You can't assign a role with equal or higher privileges"
        
        return True, None


def ensure_ultra_user():
    """
    Ensure the ultra user (theostam1966@gmail.com) exists with proper permissions.
    """
    try:
        ultra_user = CustomUser.objects.get(email='theostam1966@gmail.com')
        
        # Ensure ultra user has correct role and permissions
        if ultra_user.role not in ['superuser', 'admin'] or not ultra_user.is_superuser:
            SystemRoleManager.assign_role(ultra_user, 'superuser')
            logger.info("Updated ultra user permissions")
        
        return ultra_user
    except CustomUser.DoesNotExist:
        logger.error("Ultra user not found: theostam1966@gmail.com")
        return None


def create_demo_users():
    """
    Create demo users with proper role assignments.
    """
    demo_users = [
        {
            'email': 'manager@demo.localhost',
            'first_name': 'Demo',
            'last_name': 'Manager',
            'role': 'manager',
        },
        {
            'email': 'resident1@demo.localhost',
            'first_name': 'Demo',
            'last_name': 'Resident1',
            'role': 'resident',
        },
        {
            'email': 'resident2@demo.localhost',
            'first_name': 'Demo',
            'last_name': 'Resident2',
            'role': 'resident',
        },
    ]
    
    created_users = []
    for user_data in demo_users:
        user, created = CustomUser.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'is_active': True,
                'email_verified': True,
            }
        )
        
        if created:
            user.set_password('demo123456')
            user.save()
        
        # Assign proper system role (skip 'resident' - that's handled by Resident model)
        if user_data['role'] in SystemRoleManager.VALID_SYSTEM_ROLES:
            SystemRoleManager.assign_role(user, user_data['role'])
        elif user_data['role'] == 'resident':
            # Don't set CustomUser.role to 'resident' - that's for Resident.role only
            logger.warning(f"Skipping role assignment for {user.email}: 'resident' is not a SystemRole")
        created_users.append(user)


    return created_users


# Backward compatibility alias
RoleManager = SystemRoleManager






