#!/usr/bin/env python
"""
Complete fix for theo etherm2021@gmail.com
- Set role to manager (NOT superuser)
- Verify email
- Fix names
- Create tenant if needed
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_tenants.utils import schema_context, get_public_schema_name
from tenants.models import Client, Domain
from billing.models import UserSubscription

User = get_user_model()

def fix_theo_complete():
    """Complete fix for theo user"""
    
    email = 'etherm2021@gmail.com'
    
    print(f"\n{'='*70}")
    print(f"🔧 COMPLETE FIX FOR {email}")
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
            print(f"  Tenant: {user.tenant}")
            print(f"  Groups: {[g.name for g in user.groups.all()]}")
            
            # Check subscription
            subscription = UserSubscription.objects.filter(
                user=user,
                status='active'
            ).first()
            
            if subscription:
                print(f"\n💳 SUBSCRIPTION:")
                print(f"  Status: {subscription.status}")
                print(f"  Plan: {subscription.plan.name if subscription.plan else 'N/A'}")
            else:
                print(f"\n⚠️  WARNING: No active subscription found!")
            
            print(f"\n🔧 APPLYING FIXES...\n")
            
            # 1. Fix role and permissions
            print(f"1️⃣ Fixing role and permissions...")
            user.role = 'manager'
            user.is_superuser = False  # ← NOT Ultra Admin
            user.is_staff = True
            user.is_active = True
            user.email_verified = True
            print(f"   ✅ Set role='manager', is_superuser=False, is_staff=True")
            print(f"   ✅ Activated and verified email")
            
            # 2. Fix names
            print(f"\n2️⃣ Fixing names...")
            user.first_name = 'Theo'
            user.last_name = 'Stamatiou'
            print(f"   ✅ Set first_name='Theo', last_name='Stamatiou'")
            
            # 3. Fix groups
            print(f"\n3️⃣ Fixing groups...")
            manager_group, _ = Group.objects.get_or_create(name='Manager')
            if not user.groups.filter(name='Manager').exists():
                user.groups.add(manager_group)
                print(f"   ✅ Added to Manager group")
            else:
                print(f"   ℹ️  Already in Manager group")
            
            # Remove from Resident group
            if user.groups.filter(name='Resident').exists():
                resident_group = Group.objects.get(name='Resident')
                user.groups.remove(resident_group)
                print(f"   ✅ Removed from Resident group")
            
            # Save user changes
            user.save()
            print(f"\n💾 User changes saved!")
            
            # 4. Check/Create tenant
            print(f"\n4️⃣ Checking tenant...")
            if not user.tenant:
                print(f"   📦 Creating tenant for user...")
                
                # Create tenant
                tenant = Client.objects.create(
                    schema_name=f'theo_{user.id}',
                    name='Theo Management Office',
                    paid_until='2099-12-31',
                    on_trial=False
                )
                print(f"   ✅ Created tenant: {tenant.schema_name}")
                
                # Create domain
                domain = Domain.objects.create(
                    domain=f'theo-{user.id}.localhost',
                    tenant=tenant,
                    is_primary=True
                )
                print(f"   ✅ Created domain: {domain.domain}")
                
                # Assign tenant to user
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                print(f"   ✅ Assigned tenant to user")
            else:
                print(f"   ℹ️  User already has tenant: {user.tenant.schema_name}")
            
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
            print(f"  Tenant: {user.tenant.schema_name if user.tenant else 'None'}")
            print(f"  Groups: {[g.name for g in user.groups.all()]}")
            
            print(f"\n{'='*70}")
            print(f"📝 NEXT STEPS:")
            print(f"{'='*70}")
            print(f"1. User MUST LOGOUT from the application")
            print(f"2. User MUST LOGIN again to get new JWT token")
            print(f"3. Header should show 'Διαχειριστής' (NOT 'Ultra Admin')")
            print(f"4. Financial menu should be accessible")
            print(f"5. Buildings should be accessible")
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
    success = fix_theo_complete()
    sys.exit(0 if success else 1)


