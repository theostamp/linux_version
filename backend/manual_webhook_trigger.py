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
    """
    try:
        # Find the user by email
        user = CustomUser.objects.get(email=email)
        
        if not user.stripe_checkout_session_id:
            print(f"❌ User {email} has no checkout session ID")
            return False
        
        if user.tenant:
            print(f"✅ User {email} already has a tenant: {user.tenant.schema_name}")
            return True
        
        print(f"🔄 Triggering webhook for user: {email}")
        print(f"   Session ID: {user.stripe_checkout_session_id}")
        
        # Create mock webhook payload
        mock_session_data = {
            'id': user.stripe_checkout_session_id,
            'client_reference_id': str(user.id),
            'customer': f'cus_test_{user.id}',
            'subscription': f'sub_test_{user.id}',
            'metadata': {
                'user_id': str(user.id),
                'plan_id': '1',  # Default plan
                'tenant_subdomain': f'tenant-{user.id}',
                'building_name': 'Demo Building'
            }
        }
        
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
        webhook_view = StripeWebhookView()
        response = webhook_view.post(request)
        
        if response.status_code == 200:
            print(f"✅ Webhook processed successfully for user {email}")
            
            # Refresh user from database
            user.refresh_from_db()
            if user.tenant:
                print(f"✅ Tenant created: {user.tenant.schema_name}")
                print(f"✅ Domain: {user.tenant.schema_name}.localhost")
                return True
            else:
                print(f"❌ Tenant was not created for user {email}")
                return False
        else:
            print(f"❌ Webhook failed with status: {response.status_code}")
            return False
            
    except CustomUser.DoesNotExist:
        print(f"❌ User {email} not found")
        return False
    except Exception as e:
        print(f"❌ Error triggering webhook: {e}")
        return False

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
        success = trigger_webhook_for_user(email)
        if success:
            print(f"\n🎉 Success! User {email} now has a tenant.")
            print("   You can now access their workspace at:")
            print(f"   http://tenant-{email.split('@')[0]}.localhost:8080")
        else:
            print(f"\n❌ Failed to create tenant for {email}")
    else:
        # List pending users
        pending_users = list_pending_users()
        if pending_users:
            print(f"\n💡 To trigger webhook for a specific user, run:")
            print(f"   python manual_webhook_trigger.py <email>")
            print(f"\n   Example:")
            print(f"   python manual_webhook_trigger.py etherm2021@gmail.com")

