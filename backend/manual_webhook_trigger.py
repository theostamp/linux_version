#!/usr/bin/env python
"""
Manual webhook trigger for development.
This simulates the Stripe webhook to complete tenant creation.
"""
import os
import sys
import django
import json
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser
from billing.webhooks import StripeWebhookView
from django.test import RequestFactory
from django.http import HttpResponse

def trigger_webhook_for_user(email):
    """
    Manually trigger the webhook for a user who has completed payment.
    Returns detailed status information.
    """
    status_info = {
        'success': False,
        'user_found': False,
        'has_session': False,
        'had_tenant': False,
        'tenant_created': False,
        'errors': []
    }
    
    try:
        # Find the user by email
        print(f"\n🔍 Checking user: {email}")
        try:
            user = CustomUser.objects.get(email=email)
            status_info['user_found'] = True
            print(f"✅ User found: {user.email} (ID: {user.id})")
        except CustomUser.DoesNotExist:
            print(f"❌ User {email} not found in database")
            status_info['errors'].append(f"User {email} not found")
            return status_info
        
        # Check checkout session ID
        if not user.stripe_checkout_session_id:
            print(f"❌ User {email} has no checkout session ID")
            status_info['errors'].append("No stripe_checkout_session_id")
            return status_info
        
        status_info['has_session'] = True
        print(f"✅ Session ID: {user.stripe_checkout_session_id}")
        
        # Check if tenant already exists
        if user.tenant:
            print(f"✅ User {email} already has a tenant: {user.tenant.schema_name}")
            status_info['had_tenant'] = True
            status_info['success'] = True
            
            # Verify tenant schema exists
            from tenants.models import Client
            try:
                tenant = Client.objects.get(schema_name=user.tenant.schema_name)
                print(f"✅ Tenant schema verified: {tenant.schema_name} (ID: {tenant.id})")
                
                # Verify subscription
                from billing.models import UserSubscription
                subscription = UserSubscription.objects.filter(
                    user=user,
                    stripe_checkout_session_id=user.stripe_checkout_session_id
                ).first()
                
                if subscription:
                    print(f"✅ Subscription found: {subscription.id} (status: {subscription.status})")
                else:
                    print(f"⚠️  No subscription found for session {user.stripe_checkout_session_id}")
            except Exception as e:
                print(f"⚠️  Error verifying tenant: {e}")
                status_info['errors'].append(f"Tenant verification error: {e}")
            
            return status_info
        
        print(f"🔄 Triggering webhook for user: {email}")
        print(f"   Session ID: {user.stripe_checkout_session_id}")
        
        # Get plan ID from metadata or use default
        plan_id = '1'  # Default plan
        
        # Create mock webhook payload
        mock_session_data = {
            'id': user.stripe_checkout_session_id,
            'client_reference_id': str(user.id),
            'customer': f'cus_test_{user.id}',
            'subscription': f'sub_test_{user.id}',
            'metadata': {
                'user_id': str(user.id),
                'plan_id': plan_id,
                'tenant_subdomain': user.email.split('@')[0].lower()[:50],  # Use email prefix
                'user_email': user.email
            }
        }
        
        print(f"   Plan ID: {plan_id}")
        print(f"   Tenant subdomain: {mock_session_data['metadata']['tenant_subdomain']}")
        
        # Create mock event
        mock_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': mock_session_data
            }
        }
        
        # Create request factory and simulate webhook
        factory = RequestFactory()
        request = factory.post(
            '/api/billing/webhook/stripe/',
            data=json.dumps(mock_event),
            content_type='application/json'
        )
        
        # Add mock signature header
        request.META['HTTP_STRIPE_SIGNATURE'] = 'mock_signature'
        
        # Process the webhook
        print(f"\n📡 Processing webhook...")
        webhook_view = StripeWebhookView()
        response = webhook_view.post(request)
        
        if response.status_code == 200:
            print(f"✅ Webhook processed successfully (status: {response.status_code})")
            
            # Refresh user from database
            user.refresh_from_db()
            if user.tenant:
                print(f"✅ Tenant created: {user.tenant.schema_name}")
                print(f"   Tenant ID: {user.tenant.id}")
                print(f"   Domain: {user.tenant.schema_name}.localhost")
                
                status_info['tenant_created'] = True
                status_info['success'] = True
                
                # Verify subscription was created
                from billing.models import UserSubscription
                subscription = UserSubscription.objects.filter(
                    user=user,
                    stripe_checkout_session_id=user.stripe_checkout_session_id
                ).first()
                
                if subscription:
                    print(f"✅ Subscription created: {subscription.id} (status: {subscription.status})")
                else:
                    print(f"⚠️  Subscription not found after webhook")
                    status_info['errors'].append("Subscription not created")
                
                # Check tenant schema exists
                from django_tenants.utils import schema_exists
                if schema_exists(user.tenant.schema_name):
                    print(f"✅ Tenant schema exists in database")
                else:
                    print(f"⚠️  Tenant schema does not exist in database")
                    status_info['errors'].append(f"Schema {user.tenant.schema_name} does not exist")
                
                return status_info
            else:
                print(f"❌ Tenant was not created for user {email}")
                print(f"   Check backend logs for provisioning errors")
                status_info['errors'].append("Tenant not created after webhook")
                return status_info
        else:
            print(f"❌ Webhook failed with status: {response.status_code}")
            status_info['errors'].append(f"Webhook returned status {response.status_code}")
            
            # Try to get response body if available
            if hasattr(response, 'content'):
                print(f"   Response: {response.content}")
            
            return status_info
            
    except Exception as e:
        print(f"❌ Error triggering webhook: {e}")
        import traceback
        traceback.print_exc()
        status_info['errors'].append(f"Exception: {str(e)}")
        return status_info

def list_pending_users():
    """
    List users who have completed payment but don't have tenants yet.
    """
    pending_users = CustomUser.objects.filter(
        stripe_checkout_session_id__isnull=False,
        tenant__isnull=True
    )
    
    if not pending_users.exists():
        print("✅ No pending users found")
        return []
    
    print(f"📋 Found {pending_users.count()} pending users:")
    for user in pending_users:
        print(f"   - {user.email} (Session: {user.stripe_checkout_session_id})")
    
    return pending_users

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
        status_info = trigger_webhook_for_user(email)
        
        print(f"\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"User: {email}")
        print(f"Success: {'✅' if status_info['success'] else '❌'}")
        print(f"Tenant Created: {'✅' if status_info['tenant_created'] else '❌'}")
        
        if status_info['errors']:
            print(f"\nErrors:")
            for error in status_info['errors']:
                print(f"  - {error}")
        
        if status_info['success']:
            user = CustomUser.objects.get(email=email)
            if user.tenant:
                print(f"\n🎉 Success! User {email} now has a tenant.")
                print(f"   Tenant: {user.tenant.schema_name}")
                print(f"   Domain: {user.tenant.schema_name}.localhost")
                print(f"   Access URL: http://{user.tenant.schema_name}.localhost:8080")
        else:
            print(f"\n❌ Failed to create tenant for {email}")
            print(f"\n💡 Next steps:")
            print(f"   1. Check backend logs for provisioning errors")
            print(f"   2. Run: python scripts/verify_webhook_completion.py --email {email}")
            print(f"   3. Run: python scripts/check_tenant_provisioning.py --email {email}")
            print("=" * 80)
    else:
        # List pending users
        pending_users = list_pending_users()
        if pending_users:
            print(f"\n💡 To trigger webhook for a specific user, run:")
            print(f"   python manual_webhook_trigger.py <email>")
            print(f"\n   Example:")
            print(f"   python manual_webhook_trigger.py etherm2021@gmail.com")

