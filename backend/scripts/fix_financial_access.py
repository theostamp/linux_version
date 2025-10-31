#!/usr/bin/env python3
"""
Fix financial access permissions for users.
This script will ensure users have proper roles and permissions for financial management.
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
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_financial_access():
    """Fix financial access permissions for all users."""
    print("🔧 Fixing Financial Access Permissions")
    print("=" * 50)
    
    # 1. Create missing groups
    create_groups()
    
    # 2. Fix user roles
    fix_user_roles()
    
    # 3. Check specific user
    check_specific_user()
    
    print("\n✅ Financial Access Fix Complete!")


def create_groups():
    """Create missing Django groups."""
    print("\n📋 Creating Django Groups...")
    
    required_groups = ['Manager', 'Resident']
    
    for group_name in required_groups:
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            print(f"  ✅ Created group: {group_name}")
        else:
            print(f"  ℹ️  Group already exists: {group_name}")


def fix_user_roles():
    """Fix user roles and group memberships."""
    print("\n👥 Fixing User Roles...")
    
    users = CustomUser.objects.all()
    print(f"  Found {users.count()} users")
    
    for user in users:
        print(f"\n  User: {user.email}")
        print(f"    Current role: {user.role}")
        print(f"    is_staff: {user.is_staff}")
        print(f"    is_superuser: {user.is_superuser}")
        print(f"    Groups: {list(user.groups.values_list('name', flat=True))}")
        
        # Determine correct role based on user attributes
        if user.email == 'theostam1966@gmail.com':
            correct_role = 'superuser'
        elif user.is_superuser and user.is_staff:
            correct_role = 'admin'
        elif user.is_staff or user.role == 'manager':
            correct_role = 'manager'
        elif user.role in ['resident', 'tenant', 'owner', 'staff']:
            # Invalid SystemRole - remove it (resident roles belong to Resident model)
            correct_role = None
        elif not user.role:
            # No role is fine (for regular users who aren't managers/admins)
            correct_role = None
        else:
            # Unknown role - set to None
            correct_role = None
        
        print(f"    Correct role: {correct_role}")
        
        # Assign role if different
        if user.role != correct_role:
            try:
                if correct_role is None:
                    # Clear invalid role
                    user.role = None
                    user.save(update_fields=['role'])
                    print(f"    ✅ Cleared invalid role")
                elif correct_role in ['superuser', 'admin', 'manager']:
                    # Assign valid SystemRole
                    RoleManager.assign_role(user, correct_role)
                    print(f"    ✅ Updated to {correct_role}")
                else:
                    print(f"    ⚠️  Skipped: invalid role {correct_role}")
            except Exception as e:
                print(f"    ❌ Error updating role: {e}")
        else:
            print(f"    ✅ Role already correct")


def check_specific_user():
    """Check the specific user mentioned in the error."""
    print("\n🔍 Checking Specific User...")
    
    try:
        # Try different email variations
        email_variations = [
            'theo etherm2021@gmail.com',
            'theo.etherm2021@gmail.com',
            'theoetherm2021@gmail.com',
            'theostam1966@gmail.com'
        ]
        
        user = None
        for email in email_variations:
            try:
                user = CustomUser.objects.get(email=email)
                print(f"  ✅ Found user: {user.email}")
                break
            except CustomUser.DoesNotExist:
                continue
        
        if not user:
            print("  ❌ User not found with any email variation")
            return
        
        print(f"  User details:")
        print(f"    Email: {user.email}")
        print(f"    Role: {user.role}")
        print(f"    is_staff: {user.is_staff}")
        print(f"    is_superuser: {user.is_superuser}")
        print(f"    is_active: {user.is_active}")
        print(f"    email_verified: {user.email_verified}")
        print(f"    Groups: {list(user.groups.values_list('name', flat=True))}")
        
        # Check financial permissions
        from core.unified_permissions import get_user_permissions_summary
        permissions = get_user_permissions_summary(user)
        print(f"    Permissions: {permissions}")
        
        # Ensure user has manager role for financial access
        if user.role != 'manager' and user.role != 'admin' and user.role != 'superuser':
            print(f"    ⚠️  User needs manager role for financial access")
            try:
                RoleManager.assign_role(user, 'manager')
                print(f"    ✅ Assigned manager role")
            except Exception as e:
                print(f"    ❌ Error assigning manager role: {e}")
        
    except Exception as e:
        print(f"  ❌ Error checking user: {e}")


def show_financial_permissions():
    """Show what permissions are needed for financial access."""
    print("\n📊 Financial Access Requirements:")
    print("=" * 40)
    print("For 'Οικονομική Διαχείριση' access, user needs:")
    print("1. Role: 'manager', 'admin', or 'superuser'")
    print("2. Group: 'Manager' (for RBAC)")
    print("3. is_staff: True (for backend permissions)")
    print("4. is_active: True (for authentication)")
    print("5. email_verified: True (for security)")


def show_troubleshooting():
    """Show troubleshooting steps."""
    print("\n🔧 Troubleshooting Steps:")
    print("=" * 30)
    print("1. Check user role in database")
    print("2. Ensure user is in 'Manager' group")
    print("3. Verify is_staff = True")
    print("4. Check frontend role checking logic")
    print("5. Clear browser cache and cookies")
    print("6. Log out and log back in")


if __name__ == '__main__':
    try:
        fix_financial_access()
        show_financial_permissions()
        show_troubleshooting()
    except Exception as e:
        print(f"❌ Fix failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





