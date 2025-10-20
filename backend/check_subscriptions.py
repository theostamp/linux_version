#!/usr/bin/env python3
"""
Script to check subscription status and prevent duplicates
Usage: python check_subscriptions.py [--user-email EMAIL]
"""

import os
import sys
import django
import argparse

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from billing.models import UserSubscription
from tenants.models import Client

def check_user_subscription(email=None):
    """Check subscription status for a specific user or all users"""
    
    if email:
        try:
            user = CustomUser.objects.get(email=email)
            users = [user]
        except CustomUser.DoesNotExist:
            print(f"User with email {email} not found")
            return
    else:
        users = CustomUser.objects.all()
    
    print(f"{'Email':<30} {'Has Tenant':<12} {'Active Sub':<12} {'Sub Status':<15} {'Session ID':<30}")
    print("-" * 100)
    
    for user in users:
        has_tenant = "Yes" if user.tenant else "No"
        
        # Check for active subscriptions
        active_subs = UserSubscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']
        )
        
        if active_subs.exists():
            sub = active_subs.first()
            active_sub = "Yes"
            sub_status = sub.status
        else:
            active_sub = "No"
            sub_status = "None"
        
        session_id = user.stripe_checkout_session_id or "None"
        
        print(f"{user.email:<30} {has_tenant:<12} {active_sub:<12} {sub_status:<15} {session_id:<30}")

def check_duplicates():
    """Check for potential duplicate subscriptions"""
    
    print("\n🔍 Checking for potential duplicates...")
    
    # Users with multiple active subscriptions
    from django.db.models import Count
    duplicate_subs = UserSubscription.objects.filter(
        status__in=['active', 'trialing']
    ).values('user').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    if duplicate_subs.exists():
        print("⚠️  Found users with multiple active subscriptions:")
        for item in duplicate_subs:
            user = CustomUser.objects.get(id=item['user'])
            subs = UserSubscription.objects.filter(
                user=user,
                status__in=['active', 'trialing']
            )
            print(f"  - {user.email}: {subs.count()} active subscriptions")
            for sub in subs:
                print(f"    * ID: {sub.id}, Status: {sub.status}, Stripe: {sub.stripe_subscription_id}")
    else:
        print("✅ No duplicate active subscriptions found")
    
    # Users with tenant but no active subscription
    users_with_tenant_no_sub = CustomUser.objects.filter(
        tenant__isnull=False
    ).exclude(
        id__in=UserSubscription.objects.filter(
            status__in=['active', 'trialing']
        ).values_list('user_id', flat=True)
    )
    
    if users_with_tenant_no_sub.exists():
        print("\n⚠️  Found users with tenant but no active subscription:")
        for user in users_with_tenant_no_sub:
            print(f"  - {user.email}: Tenant '{user.tenant.schema_name}' but no active subscription")
    else:
        print("✅ All users with tenants have active subscriptions")

def cleanup_orphaned_sessions():
    """Clean up orphaned checkout sessions (users with session ID but no tenant)"""
    
    print("\n🧹 Checking for orphaned checkout sessions...")
    
    orphaned_users = CustomUser.objects.filter(
        stripe_checkout_session_id__isnull=False,
        tenant__isnull=True
    )
    
    if orphaned_users.exists():
        print(f"Found {orphaned_users.count()} users with orphaned checkout sessions:")
        for user in orphaned_users:
            print(f"  - {user.email}: Session {user.stripe_checkout_session_id}")
        
        response = input("\nDo you want to clear these orphaned sessions? (y/N): ")
        if response.lower() == 'y':
            count = orphaned_users.update(stripe_checkout_session_id=None)
            print(f"✅ Cleared {count} orphaned checkout sessions")
    else:
        print("✅ No orphaned checkout sessions found")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Check subscription status')
    parser.add_argument('--user-email', help='Check specific user by email')
    parser.add_argument('--check-duplicates', action='store_true', help='Check for duplicates')
    parser.add_argument('--cleanup', action='store_true', help='Clean up orphaned sessions')
    
    args = parser.parse_args()
    
    if args.user_email:
        check_user_subscription(args.user_email)
    else:
        check_user_subscription()
    
    if args.check_duplicates:
        check_duplicates()
    
    if args.cleanup:
        cleanup_orphaned_sessions()
    
    if not any([args.check_duplicates, args.cleanup]):
        print("\nUse --check-duplicates to check for duplicates")
        print("Use --cleanup to clean up orphaned sessions")
