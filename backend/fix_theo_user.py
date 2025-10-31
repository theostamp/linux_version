#!/usr/bin/env python
"""
Quick fix script for theo etherm2021@gmail.com user role
Run this directly on Railway or local Django environment
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from django.contrib.auth.models import Group

def fix_theo_user():
    """Fix theo user role and permissions"""
    
    email = 'etherm2021@gmail.com'
    
    try:
        # Get user
        user = CustomUser.objects.get(email=email)
        print(f"\n{'='*60}")
        print(f"Found user: {user.email}")
        print(f"{'='*60}")
        
        # Current state
        print(f"\n📊 CURRENT STATE:")
        print(f"  - Role: {user.role}")
        print(f"  - is_staff: {user.is_staff}")
        print(f"  - is_superuser: {user.is_superuser}")
        print(f"  - Groups: {[g.name for g in user.groups.all()]}")
        
        # Check subscription
        from billing.models import UserSubscription
        subscription = UserSubscription.objects.filter(
            user=user,
            status='active'
        ).first()
        
        if subscription:
            print(f"\n💳 SUBSCRIPTION:")
            print(f"  - Status: {subscription.status}")
            print(f"  - Plan: {subscription.plan_id}")
            print(f"  - Stripe Customer: {subscription.stripe_customer_id}")
        else:
            print(f"\n⚠️  WARNING: No active subscription found!")
            print(f"  - User should have an active subscription to be a Manager")
        
        # Fix role
        print(f"\n🔧 APPLYING FIX...")
        
        # Set role to manager
        user.role = 'manager'
        user.is_staff = True
        user.save(update_fields=['role', 'is_staff'])
        print(f"  ✅ Set role to 'manager'")
        print(f"  ✅ Set is_staff to True")
        
        # Add to Manager group
        manager_group, created = Group.objects.get_or_create(name='Manager')
        if not user.groups.filter(name='Manager').exists():
            user.groups.add(manager_group)
            print(f"  ✅ Added to Manager group")
        else:
            print(f"  ℹ️  Already in Manager group")
        
        # Remove from Resident group
        if user.groups.filter(name='Resident').exists():
            resident_group = Group.objects.get(name='Resident')
            user.groups.remove(resident_group)
            print(f"  ✅ Removed from Resident group")
        else:
            print(f"  ℹ️  Not in Resident group")
        
        # Final state
        user.refresh_from_db()
        print(f"\n✅ NEW STATE:")
        print(f"  - Role: {user.role}")
        print(f"  - is_staff: {user.is_staff}")
        print(f"  - is_superuser: {user.is_superuser}")
        print(f"  - Groups: {[g.name for g in user.groups.all()]}")
        
        print(f"\n{'='*60}")
        print(f"✅ SUCCESS! User {email} is now a Manager")
        print(f"{'='*60}")
        print(f"\n📝 NEXT STEPS:")
        print(f"  1. User should LOGOUT from the application")
        print(f"  2. User should LOGIN again")
        print(f"  3. Header should show 'Διαχειριστής' instead of 'Χρήστης'")
        print(f"  4. Financial Management should be accessible")
        print(f"\n")
        
        return True
        
    except CustomUser.DoesNotExist:
        print(f"\n❌ ERROR: User {email} not found!")
        print(f"   Please check the email address.")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("\n🚀 THEO USER FIX SCRIPT")
    print("=" * 60)
    success = fix_theo_user()
    sys.exit(0 if success else 1)






