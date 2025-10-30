#!/usr/bin/env python3
"""
Test script for the role system.
Tests all role permissions and access controls.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import Group
from users.models import CustomUser
from users.role_management import RoleManager
from core.unified_permissions import get_user_effective_role, get_user_permissions_summary
from buildings.models import Building
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_role_system():
    """Test the complete role system."""
    print("🧪 Testing Role System")
    print("=" * 50)
    
    # 1. Test role definitions
    test_role_definitions()
    
    # 2. Test role assignment
    test_role_assignment()
    
    # 3. Test permission checking
    test_permission_checking()
    
    # 4. Test user management
    test_user_management()
    
    # 5. Test ultra user
    test_ultra_user()
    
    print("\n✅ Role System Test Complete!")


def test_role_definitions():
    """Test role definitions."""
    print("\n📋 Testing Role Definitions...")
    
    for role_name, role_def in RoleManager.ROLE_DEFINITIONS.items():
        print(f"  {role_name}:")
        print(f"    Name: {role_def['name']}")
        print(f"    Description: {role_def['description']}")
        print(f"    is_superuser: {role_def['is_superuser']}")
        print(f"    is_staff: {role_def['is_staff']}")
        print(f"    Groups: {role_def['django_groups']}")
        print(f"    Permissions: {len(role_def['permissions'])} permissions")


def test_role_assignment():
    """Test role assignment functionality."""
    print("\n👤 Testing Role Assignment...")
    
    # Create a test user
    test_user, created = CustomUser.objects.get_or_create(
        email='test@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': True,
            'email_verified': True,
        }
    )
    
    if created:
        test_user.set_password('test123456')
        test_user.save()
        print(f"  ✅ Created test user: {test_user.email}")
    
    # Test role assignment
    test_roles = ['resident', 'manager', 'admin']
    
    for role in test_roles:
        try:
            RoleManager.assign_role(test_user, role)
            effective_role = get_user_effective_role(test_user)
            permissions = get_user_permissions_summary(test_user)
            
            print(f"  ✅ Assigned role '{role}' to {test_user.email}")
            print(f"    Effective role: {effective_role}")
            print(f"    Groups: {permissions['groups']}")
            print(f"    Permissions: {len(permissions['permissions'])} permissions")
            
        except Exception as e:
            print(f"  ❌ Failed to assign role '{role}': {e}")
    
    # Clean up
    test_user.delete()
    print(f"  🧹 Cleaned up test user")


def test_permission_checking():
    """Test permission checking functionality."""
    print("\n🔐 Testing Permission Checking...")
    
    # Create test users with different roles
    test_users = {}
    
    for role in ['resident', 'manager', 'admin']:
        user, created = CustomUser.objects.get_or_create(
            email=f'test_{role}@example.com',
            defaults={
                'first_name': f'Test{role.title()}',
                'last_name': 'User',
                'is_active': True,
                'email_verified': True,
            }
        )
        
        if created:
            user.set_password('test123456')
            user.save()
        
        RoleManager.assign_role(user, role)
        test_users[role] = user
    
    # Test permissions
    test_permissions = [
        'can_manage_financials',
        'can_view_analytics',
        'can_invite_residents',
        'can_manage_all_users',
    ]
    
    for role, user in test_users.items():
        print(f"  {role.upper()}:")
        for permission in test_permissions:
            has_permission = RoleManager.has_permission(user, permission)
            status = "✅" if has_permission else "❌"
            print(f"    {status} {permission}")
    
    # Clean up
    for user in test_users.values():
        user.delete()
    print(f"  🧹 Cleaned up test users")


def test_user_management():
    """Test user management permissions."""
    print("\n👥 Testing User Management...")
    
    # Create test users
    manager = CustomUser.objects.create(
        email='manager@example.com',
        first_name='Manager',
        last_name='User',
        is_active=True,
        email_verified=True,
    )
    manager.set_password('test123456')
    manager.save()
    RoleManager.assign_role(manager, 'manager')
    
    resident = CustomUser.objects.create(
        email='resident@example.com',
        first_name='Resident',
        last_name='User',
        is_active=True,
        email_verified=True,
    )
    resident.set_password('test123456')
    resident.save()
    RoleManager.assign_role(resident, 'resident')
    
    # Test management permissions
    print(f"  Manager can manage resident: {RoleManager.can_manage_user(manager, resident)}")
    print(f"  Resident can manage manager: {RoleManager.can_manage_user(resident, manager)}")
    print(f"  Manager can manage themselves: {RoleManager.can_manage_user(manager, manager)}")
    
    # Clean up
    manager.delete()
    resident.delete()
    print(f"  🧹 Cleaned up test users")


def test_ultra_user():
    """Test ultra user functionality."""
    print("\n👑 Testing Ultra User...")
    
    try:
        ultra_user = CustomUser.objects.get(email='theostam1966@gmail.com')
        
        # Ensure ultra user has correct permissions
        ensure_ultra_user()
        
        # Test ultra user permissions
        permissions = get_user_permissions_summary(ultra_user)
        print(f"  Ultra User: {ultra_user.email}")
        print(f"  Role: {permissions['role']}")
        print(f"  is_superuser: {permissions['is_superuser']}")
        print(f"  is_staff: {permissions['is_staff']}")
        print(f"  Groups: {permissions['groups']}")
        
        # Test all permissions
        all_permissions = [
            'can_manage_all_tenants',
            'can_manage_all_users',
            'can_access_all_buildings',
            'can_manage_billing',
            'can_view_analytics',
            'can_manage_system_settings',
        ]
        
        print(f"  Permissions:")
        for permission in all_permissions:
            has_permission = RoleManager.has_permission(ultra_user, permission)
            status = "✅" if has_permission else "❌"
            print(f"    {status} {permission}")
        
    except CustomUser.DoesNotExist:
        print("  ❌ Ultra user not found: theostam1966@gmail.com")
        print("  💡 Run: python manage.py fix_role_system --fix-ultra-user")


def show_system_status():
    """Show current system status."""
    print("\n📊 Current System Status:")
    print("=" * 30)
    
    # Count users by role
    role_counts = {}
    for user in CustomUser.objects.all():
        role = get_user_effective_role(user)
        role_counts[role] = role_counts.get(role, 0) + 1
    
    print("Users by Role:")
    for role, count in sorted(role_counts.items()):
        print(f"  {role}: {count} users")
    
    # Show groups
    print("\nDjango Groups:")
    for group in Group.objects.all():
        user_count = group.user_set.count()
        print(f"  {group.name}: {user_count} users")


if __name__ == '__main__':
    try:
        test_role_system()
        show_system_status()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


