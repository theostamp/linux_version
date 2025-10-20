#!/usr/bin/env python3
"""
Script to simulate Stripe webhook for development
Usage: python simulate_webhook.py <session_id>
"""

import os
import sys
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from users.models import CustomUser

def simulate_webhook(session_id):
    """Simulate a Stripe webhook for checkout.session.completed"""
    
    # Find the user with this session ID
    try:
        user = CustomUser.objects.get(stripe_checkout_session_id=session_id)
        print(f"Found user: {user.email}")
    except CustomUser.DoesNotExist:
        print(f"User with session ID {session_id} not found")
        return False
    
    # Check if user already has a tenant
    if user.tenant:
        print(f"User {user.email} already has tenant: {user.tenant.schema_name}")
        return True
    
    # Simulate webhook payload
    webhook_payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "client_reference_id": str(user.id),
                "customer": f"cus_mock_{user.id}",
                "subscription": f"sub_mock_{user.id}",
                "metadata": {
                    "user_id": str(user.id),
                    "plan_id": "3",  # Default to plan 3
                    "tenant_subdomain": user.email.split('@')[0],  # Use email prefix as subdomain
                    "building_name": ""
                }
            }
        }
    }
    
    # Send webhook to our endpoint
    webhook_url = "http://localhost:8080/api/billing/webhook/stripe/"
    
    try:
        response = requests.post(
            webhook_url,
            json=webhook_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            print(f"✅ Webhook simulated successfully for session {session_id}")
            return True
        else:
            print(f"❌ Webhook failed with status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error sending webhook: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python simulate_webhook.py <session_id>")
        sys.exit(1)
    
    session_id = sys.argv[1]
    success = simulate_webhook(session_id)
    sys.exit(0 if success else 1)
