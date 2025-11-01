#!/usr/bin/env python
"""
Verify Stripe webhook completion status.
Reads backend logs to find checkout.session.completed events and provisioning status.
"""
import os
import sys
import django
import re
from datetime import datetime
from collections import defaultdict

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from tenants.models import Client
from billing.models import UserSubscription
import logging

# Configure logging to capture Django logs
logger = logging.getLogger(__name__)


def check_user_provisioning_status(email=None):
    """
    Check provisioning status for a specific user or all users with checkout sessions.
    
    Args:
        email (str, optional): User email to check. If None, checks all users with checkout sessions.
    
    Returns:
        dict: Status report with user provisioning details
    """
    report = {
        'timestamp': datetime.now().isoformat(),
        'users_checked': [],
        'summary': {
            'total': 0,
            'completed': 0,
            'pending': 0,
            'failed': 0
        }
    }
    
    # Find users to check
    if email:
        try:
            users = [CustomUser.objects.get(email=email)]
        except CustomUser.DoesNotExist:
            print(f"❌ User {email} not found")
            return report
    else:
        # Check all users with checkout session IDs
        users = CustomUser.objects.filter(
            stripe_checkout_session_id__isnull=False
        )
    
    report['summary']['total'] = users.count()
    
    for user in users:
        user_status = {
            'email': user.email,
            'session_id': user.stripe_checkout_session_id,
            'has_tenant': user.tenant is not None,
            'tenant_schema': user.tenant.schema_name if user.tenant else None,
            'tenant_id': user.tenant_id,
            'has_subscription': False,
            'subscription_status': None,
            'status': 'pending',
            'errors': []
        }
        
        # Check subscription
        subscription = UserSubscription.objects.filter(
            stripe_checkout_session_id=user.stripe_checkout_session_id
        ).first()
        
        if subscription:
            user_status['has_subscription'] = True
            user_status['subscription_status'] = subscription.status
        
        # Determine overall status
        if user.tenant:
            if subscription and subscription.status in ['active', 'trial', 'trialing']:
                user_status['status'] = 'completed'
                report['summary']['completed'] += 1
                
                # Look for provisioning complete log message pattern
                expected_message = f"Provisioning complete for {user.email} → {user.tenant.schema_name}"
                user_status['expected_log_message'] = expected_message
            else:
                user_status['status'] = 'partial'
                user_status['errors'].append('Tenant exists but subscription is missing or inactive')
                report['summary']['failed'] += 1
        else:
            user_status['status'] = 'pending'
            report['summary']['pending'] += 1
            
            # Check if there was a webhook attempt
            if user.stripe_checkout_session_id:
                user_status['errors'].append('Webhook may not have completed yet or failed')
        
        report['users_checked'].append(user_status)
    
    return report


def print_report(report):
    """Print a formatted report of provisioning status."""
    print("\n" + "=" * 80)
    print("STRIPE WEBHOOK PROVISIONING STATUS REPORT")
    print("=" * 80)
    print(f"Timestamp: {report['timestamp']}")
    print(f"\nSummary:")
    print(f"  Total users: {report['summary']['total']}")
    print(f"  ✅ Completed: {report['summary']['completed']}")
    print(f"  ⏳ Pending: {report['summary']['pending']}")
    print(f"  ❌ Failed/Partial: {report['summary']['failed']}")
    print("\n" + "-" * 80)
    
    for user_status in report['users_checked']:
        status_icon = {
            'completed': '✅',
            'pending': '⏳',
            'partial': '⚠️',
            'failed': '❌'
        }.get(user_status['status'], '❓')
        
        print(f"\n{status_icon} {user_status['email']}")
        print(f"   Session ID: {user_status['session_id']}")
        print(f"   Status: {user_status['status'].upper()}")
        
        if user_status['has_tenant']:
            print(f"   ✅ Tenant: {user_status['tenant_schema']} (ID: {user_status['tenant_id']})")
        else:
            print(f"   ❌ No tenant assigned")
        
        if user_status['has_subscription']:
            print(f"   ✅ Subscription: {user_status['subscription_status']}")
        else:
            print(f"   ❌ No subscription found")
        
        if user_status.get('expected_log_message'):
            print(f"   📋 Expected log: {user_status['expected_log_message']}")
        
        if user_status['errors']:
            print(f"   ⚠️  Errors:")
            for error in user_status['errors']:
                print(f"      - {error}")
    
    print("\n" + "=" * 80)
    
    # Instructions for checking logs
    print("\n💡 To check backend logs for provisioning messages:")
    print("   1. Check Railway logs or Django log files")
    print("   2. Search for: '[WEBHOOK] checkout.session.completed'")
    print("   3. Search for: 'Provisioning complete for <email> → <schema>'")
    print("   4. Search for exceptions with '[WEBHOOK] Provisioning failed'")


def check_schema_exists(schema_name):
    """Check if a tenant schema exists in the database."""
    try:
        tenant = Client.objects.get(schema_name=schema_name)
        return {
            'exists': True,
            'tenant_id': tenant.id,
            'name': tenant.name,
            'is_active': tenant.is_active
        }
    except Client.DoesNotExist:
        return {'exists': False}


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Verify Stripe webhook completion status'
    )
    parser.add_argument(
        '--email',
        help='Check status for specific user email'
    )
    parser.add_argument(
        '--schema',
        help='Check if tenant schema exists'
    )
    args = parser.parse_args()
    
    if args.schema:
        result = check_schema_exists(args.schema)
        if result['exists']:
            print(f"✅ Schema '{args.schema}' exists:")
            print(f"   Tenant ID: {result['tenant_id']}")
            print(f"   Name: {result['name']}")
            print(f"   Active: {result['is_active']}")
        else:
            print(f"❌ Schema '{args.schema}' does not exist")
        return
    
    # Check provisioning status
    report = check_user_provisioning_status(email=args.email)
    print_report(report)


if __name__ == '__main__':
    main()

