# backend/users/role_management.py

from django.contrib.auth.models import Group
from django.db import transaction
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)


class RoleManager:
    """
    Centralized role management system for the Concierge platform.
    
    Handles role assignment, permission validation, and role hierarchy.
    """
    
    # Role hierarchy (higher number = more permissions)
    ROLE_HIERARCHY = {
        'superuser': 100,
        'admin': 90,
        'manager': 80,
        'staff': 70,
        'resident': 60,
        'guest': 50,
    }
    
    # Role definitions with permissions
    ROLE_DEFINITIONS = {
        'superuser': {
            'name': 'Ultra Superuser',
            'description': 'Complete system administration access',
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
            'name': 'Tenant Administrator',
            'description': 'Full admin access within tenant',
            'permissions': {
                'can_manage_tenant_users': True,
                'can_manage_tenant_buildings': True,
                'can_access_tenant_analytics': True,
                'can_manage_tenant_billing': True,
                'can_invite_users': True,
            },
            'django_groups': ['Manager'],
            'is_superuser': False,
            'is_staff': True,
        },
        'manager': {
            'name': 'Office Manager',
            'description': 'Building management and user invitation',
            'permissions': {
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
        'staff': {
            'name': 'Staff Member',
            'description': 'Limited administrative access',
            'permissions': {
                'can_view_buildings': True,
                'can_manage_maintenance': True,
                'can_view_financials': True,
                'can_manage_residents': False,
            },
            'django_groups': ['Manager'],
            'is_superuser': False,
            'is_staff': True,
        },
        'resident': {
            'name': 'Resident',
            'description': 'Regular user with building access',
            'permissions': {
                'can_view_own_data': True,
                'can_submit_maintenance_requests': True,
                'can_participate_in_votes': True,
                'can_view_building_announcements': True,
                'can_manage_own_profile': True,
            },
            'django_groups': ['Resident'],
            'is_superuser': False,
            'is_staff': False,
        },
    }
    
    @classmethod
    def assign_role(cls, user, role_name, building=None):
        """
        Assign a role to a user with proper group membership and permissions.
        
        Args:
            user: CustomUser instance
            role_name: Role to assign
            building: Building instance (for building-specific roles)
        """
        if role_name not in cls.ROLE_DEFINITIONS:
            raise ValueError(f"Invalid role: {role_name}")
        
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
        
        # Get role hierarchy levels
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
        if ultra_user.role != 'admin' or not ultra_user.is_superuser:
            RoleManager.assign_role(ultra_user, 'superuser')
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
        
        # Assign proper role
        RoleManager.assign_role(user, user_data['role'])
        created_users.append(user)
    
    return created_users


