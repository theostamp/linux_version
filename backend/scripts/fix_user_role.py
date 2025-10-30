#!/usr/bin/env python3
"""
Script to fix user role for paid subscription users
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app' if os.path.exists('/app/manage.py') else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_tenants.utils import schema_context, get_public_schema_name

User = get_user_model()

def fix_user_role(email):
    """Fix role for a specific user"""
    print(f"\n🔧 Fixing role for user: {email}")
    print("=" * 60)
    
    try:
        # Work in public schema
        with schema_context(get_public_schema_name()):
            user = User.objects.get(email=email)
            
            print(f"\n📊 Current User Status:")
            print(f"   Email: {user.email}")
            print(f"   Username: {user.username}")
            print(f"   Role: {user.role}")
            print(f"   is_staff: {user.is_staff}")
            print(f"   is_superuser: {user.is_superuser}")
            print(f"   is_active: {user.is_active}")
            print(f"   email_verified: {user.email_verified}")
            print(f"   Tenant: {user.tenant}")
            
            # Check subscription
            from billing.models import UserSubscription
            subscriptions = UserSubscription.objects.filter(user=user)
            print(f"\n💳 Subscriptions: {subscriptions.count()}")
            for sub in subscriptions:
                print(f"   - Status: {sub.status}, Plan: {sub.plan.name if sub.plan else 'None'}")
            
            # Check groups
            groups = user.groups.all()
            print(f"\n👥 Groups: {groups.count()}")
            for group in groups:
                print(f"   - {group.name}")
            
            # Fix the role
            print(f"\n🔧 Fixing user role...")
            
            # Update user role to manager
            user.role = 'manager'
            user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])
            
            # Ensure user is in Manager group
            manager_group, created = Group.objects.get_or_create(name='Manager')
            if not user.groups.filter(name='Manager').exists():
                user.groups.add(manager_group)
                print(f"   ✅ Added to Manager group")
            
            # Remove from Resident group if present
            if user.groups.filter(name='Resident').exists():
                resident_group = Group.objects.get(name='Resident')
                user.groups.remove(resident_group)
                print(f"   ✅ Removed from Resident group")
            
            print(f"\n✅ User role fixed successfully!")
            print(f"\n📊 Updated User Status:")
            print(f"   Role: {user.role}")
            print(f"   is_staff: {user.is_staff}")
            print(f"   Groups: {', '.join([g.name for g in user.groups.all()])}")
            
            return True
            
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return False
    except Exception as e:
        print(f"❌ Error fixing user role: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # Fix the specific user
    email = 'etherm2021@gmail.com'
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
    
    success = fix_user_role(email)
    
    if success:
        print(f"\n🎉 Done! User {email} should now have access to Financial Management.")
        print(f"\n📝 Next steps:")
        print(f"   1. User should log out and log back in")
        print(f"   2. Navigate to {email.split('@')[0]}.linux-version.vercel.app/financial")
        print(f"   3. Financial Management should now be accessible")
    else:
        print(f"\n❌ Failed to fix user role. Please check the error messages above.")
    
    sys.exit(0 if success else 1)

