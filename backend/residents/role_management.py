# backend/residents/role_management.py

"""
ResidentRoleManager: Manages apartment-level roles (Resident.Role).

This is separate from SystemRoleManager which handles Django tenant-level roles.
Resident roles are stored in the Resident model, not in CustomUser.role.

Valid Resident.Role values:
- 'manager': Εσωτερικός Διαχειριστής (Internal Building Manager)
- 'owner': Ιδιοκτήτης (Apartment Owner)
- 'tenant': Ένοικος (Apartment Tenant)
"""

from .models import Resident
import logging

logger = logging.getLogger(__name__)


class ResidentRoleManager:
    """
    Apartment-level role management for Resident model.
    
    Handles only resident roles: 'manager', 'owner', 'tenant'
    These are apartment-level roles stored in Resident.role.
    
    For system-level roles (superuser, admin, manager), see SystemRoleManager.
    """
    
    # Valid Resident.Role values (from Resident.Role enum)
    VALID_RESIDENT_ROLES = ['manager', 'owner', 'tenant']
    
    # Role hierarchy for residents (higher number = more permissions within building)
    RESIDENT_ROLE_HIERARCHY = {
        'manager': 30,  # Internal building manager (within apartment context)
        'owner': 20,    # Apartment owner
        'tenant': 10,   # Apartment tenant
    }
    
    # Role definitions with permissions
    RESIDENT_ROLE_DEFINITIONS = {
        'manager': {
            'name': 'Εσωτερικός Διαχειριστής',
            'description': 'Internal building manager (apartment level)',
            'permissions': {
                'can_manage_building_internal': True,
                'can_view_all_apartments': True,
                'can_manage_own_apartment': True,
                'can_submit_maintenance_requests': True,
                'can_participate_in_votes': True,
                'can_view_building_announcements': True,
            },
        },
        'owner': {
            'name': 'Ιδιοκτήτης',
            'description': 'Apartment owner',
            'permissions': {
                'can_manage_own_apartment': True,
                'can_submit_maintenance_requests': True,
                'can_participate_in_votes': True,
                'can_view_building_announcements': True,
                'can_view_financials_own_apartment': True,
            },
        },
        'tenant': {
            'name': 'Ένοικος',
            'description': 'Apartment tenant',
            'permissions': {
                'can_view_own_apartment_data': True,
                'can_submit_maintenance_requests': True,
                'can_participate_in_votes': True,
                'can_view_building_announcements': True,
            },
        },
    }
    
    @classmethod
    def assign_resident_role(cls, resident, role_name):
        """
        Assign a resident role to a Resident instance.
        
        Args:
            resident: Resident instance
            role_name: Resident role to assign ('manager', 'owner', or 'tenant')
        
        Raises:
            ValueError: If role_name is not a valid Resident.Role
        """
        if role_name not in cls.VALID_RESIDENT_ROLES:
            raise ValueError(
                f"Invalid Resident.Role: '{role_name}'. "
                f"Valid values: {cls.VALID_RESIDENT_ROLES}"
            )
        
        resident.role = role_name
        resident.save(update_fields=['role'])
        logger.info(f"Assigned resident role '{role_name}' to {resident.user.email} in {resident.building.name}")
    
    @classmethod
    def get_resident_permissions(cls, resident):
        """
        Get effective permissions for a resident based on their role.
        
        Args:
            resident: Resident instance
            
        Returns:
            dict: Resident's effective permissions
        """
        if not resident:
            return {}
        
        role_name = resident.role
        if role_name and role_name in cls.RESIDENT_ROLE_DEFINITIONS:
            return cls.RESIDENT_ROLE_DEFINITIONS[role_name]['permissions'].copy()
        
        return {}
    
    @classmethod
    def has_permission(cls, resident, permission):
        """
        Check if resident has a specific permission.
        
        Args:
            resident: Resident instance
            permission: Permission to check
            
        Returns:
            bool: True if resident has permission
        """
        resident_permissions = cls.get_resident_permissions(resident)
        return resident_permissions.get(permission, False)
    
    @classmethod
    def get_resident_hierarchy(cls):
        """
        Get resident role hierarchy for display purposes.
        
        Returns:
            list: Resident roles ordered by hierarchy (highest first)
        """
        return sorted(cls.RESIDENT_ROLE_HIERARCHY.items(), 
                     key=lambda x: x[1], reverse=True)
    
    @classmethod
    def can_manage_resident(cls, manager_resident, target_resident):
        """
        Check if manager_resident can manage target_resident.
        
        Args:
            manager_resident: Resident trying to manage
            target_resident: Resident being managed
        
        Returns:
            bool: True if manager_resident can manage target_resident
        """
        if not manager_resident or not target_resident:
            return False
        
        # Must be in same building
        if manager_resident.building != target_resident.building:
            return False
        
        # Get role hierarchy levels
        manager_level = cls.RESIDENT_ROLE_HIERARCHY.get(manager_resident.role, 0)
        target_level = cls.RESIDENT_ROLE_HIERARCHY.get(target_resident.role, 0)
        
        # Manager must have higher level than target
        return manager_level > target_level

