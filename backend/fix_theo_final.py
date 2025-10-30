#!/usr/bin/env python
"""
Complete fix for theo etherm2021@gmail.com - Final version
- Fixes role, email verification, names, and subscription
"""

import os
import sys
import django
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_tenants.utils import schema_context, get_public_schema_name
from billing.models import UserSubscription, SubscriptionPlan

User = get_user_model()

def fix_theo_final():
    """Complete final fix for theo user"""
    
    email = 'etherm2021@gmail.com'
    
    print(f"\n{'='*70}")
    print(f"🔧 FINAL FIX FOR {email}")
    print(f"{'='*70}\n")
    
    with schema_context(get_public_schema_name()):
        try:
            # Get user
            user = User.objects.get(email=email)
            
            print(f"📊 CURRENT STATE:")
            print(f"  Email: {user.email}")
            print(f"  First Name: {user.first_name}")
            print(f"  Last Name: {user.last_name}")
            print(f"  Role: {user.role}")
            print(f"  is_superuser: {user.is_superuser}")
            print(f"  is_staff: {user.is_staff}")
            print(f"  is_active: {user.is_active}")
            print(f"  email_verified: {user.email_verified}")
            
            # Check subscription
            subscription = UserSubscription.objects.filter(
                user=user,
                status='active'
            ).first()
            
            if subscription:
                print(f"  Subscription: {subscription.plan.name if subscription.plan else 'N/A'} ({subscription.status})")
            else:
                print(f"  Subscription: ❌ NONE")
            
            print(f"\n🔧 APPLYING FIXES...\n")
            
            # 1. Fix role and permissions
            print(f"1️⃣ Fixing role and permissions...")
            user.role = 'manager'
            user.is_superuser = False
            user.is_staff = True
            user.is_active = True
            user.email_verified = True
            print(f"   ✅ Set role='manager', is_superuser=False, is_staff=True")
            print(f"   ✅ Activated and verified email")
            
            # 2. Fix names
            print(f"\n2️⃣ Fixing names...")
            user.first_name = 'Theo'
            # Fix last name - remove email if it's wrong
            if user.last_name == email or '@' in user.last_name:
                user.last_name = 'Stamatiou'
            print(f"   ✅ Set first_name='{user.first_name}', last_name='{user.last_name}'")
            
            # 3. Fix groups
            print(f"\n3️⃣ Fixing groups...")
            manager_group, _ = Group.objects.get_or_create(name='Manager')
            if not user.groups.filter(name='Manager').exists():
                user.groups.add(manager_group)
                print(f"   ✅ Added to Manager group")
            
            if user.groups.filter(name='Resident').exists():
                resident_group = Group.objects.get(name='Resident')
                user.groups.remove(resident_group)
                print(f"   ✅ Removed from Resident group")
            
            # Save user changes
            user.save()
            print(f"\n💾 User changes saved!")
            
            # 4. Create/Activate subscription
            print(f"\n4️⃣ Checking subscription...")
            if not subscription:
                print(f"   📦 Creating subscription...")
                
                # Get professional plan (or first available active plan)
                plan = SubscriptionPlan.objects.filter(plan_type='professional', is_active=True).first()
                if not plan:
                    plan = SubscriptionPlan.objects.filter(is_active=True).first()
                
                if not plan:
                    print(f"   ⚠️  No active plans found. Plans should be created by migrations.")
                    print(f"   ⚠️  Skipping subscription creation. Run migrations first.")
                else:
                    # Create subscription
                    subscription = UserSubscription.objects.create(
                        user=user,
                        plan=plan,
                        status='active',
                        started_at=datetime.now(),
                        current_period_start=datetime.now(),
                        current_period_end=datetime.now() + timedelta(days=365),  # 1 year
                        stripe_customer_id=f'cust_theo_{user.id}',
                        stripe_subscription_id=f'sub_theo_{user.id}'
                    )
                    print(f"   ✅ Created subscription: {plan.name} (Active)")
            else:
                # Ensure subscription is active
                if subscription.status != 'active':
                    subscription.status = 'active'
                    subscription.save()
                    print(f"   ✅ Activated existing subscription")
                else:
                    print(f"   ℹ️  Subscription already active: {subscription.plan.name if subscription.plan else 'N/A'}")
            
            # Refresh user
            user.refresh_from_db()
            
            print(f"\n{'='*70}")
            print(f"✅ SUCCESS! User fixed completely")
            print(f"{'='*70}\n")
            
            print(f"📊 NEW STATE:")
            print(f"  Email: {user.email}")
            print(f"  Name: {user.first_name} {user.last_name}")
            print(f"  Role: {user.role}")
            print(f"  is_superuser: {user.is_superuser}")
            print(f"  is_staff: {user.is_staff}")
            print(f"  is_active: {user.is_active}")
            print(f"  email_verified: {user.email_verified}")
            print(f"  Groups: {[g.name for g in user.groups.all()]}")
            
            # Refresh subscription if exists
            subscription = UserSubscription.objects.filter(user=user).first()
            if subscription:
                subscription.refresh_from_db()
                print(f"  Subscription: {subscription.plan.name if subscription.plan else 'N/A'} ({subscription.status})")
            else:
                print(f"  Subscription: ❌ NONE (No active plans found in database)")
            
            print(f"\n{'='*70}")
            print(f"📝 NEXT STEPS:")
            print(f"{'='*70}")
            print(f"1. User MUST LOGOUT from the application")
            print(f"2. User MUST LOGIN again to get new JWT token")
            print(f"3. Profile should show 'Επιβεβαιωμένος' (not 'Μη Επιβεβαιωμένος')")
            print(f"4. Subscription should show active plan")
            print(f"5. Last name should be correct (not email)")
            print(f"{'='*70}\n")
            
            return True
            
        except User.DoesNotExist:
            print(f"\n❌ ERROR: User {email} not found!")
            return False
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = fix_theo_final()
    sys.exit(0 if success else 1)

