import os
import sys
import django
import json
import requests
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from billing.models import SubscriptionPlan, UserSubscription
from tenants.models import Client
from users.models import CustomUser

def test_stripe_webhooks():
    """Test Stripe webhooks με simulation"""
    
    print("🧪 TEST: Stripe Webhooks")
    print("=" * 60)
    
    with schema_context('demo'):
        # Έλεγχος αρχικής κατάστασης
        print("📋 Αρχική Κατάσταση:")
        print("-" * 40)
        
        tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Demo Tenant: {tenant.name}")
        print(f"   - is_active: {tenant.is_active}")
        print(f"   - on_trial: {tenant.on_trial}")
        print(f"   - paid_until: {tenant.paid_until}")
        
        # Έλεγχος subscription plans
        plans = SubscriptionPlan.objects.all()
        print(f"\n📊 Subscription Plans: {plans.count()}")
        for plan in plans:
            print(f"   - {plan.name}: €{plan.monthly_price} ({plan.stripe_price_id_monthly})")
        
        # Έλεγχος υπάρχουσων subscriptions
        subscriptions = UserSubscription.objects.all()
        print(f"\n💳 User Subscriptions: {subscriptions.count()}")
        for sub in subscriptions:
            print(f"   - {sub.user.email}: {sub.status} ({sub.stripe_subscription_id})")
        
        print("\n" + "=" * 60)
        print("🎯 WEBHOOK TESTING SCENARIOS:")
        print("=" * 60)
        
        # Test 1: Subscription Created
        print("\n🔍 Test 1: Subscription Created Webhook")
        print("-" * 40)
        
        # Δημιουργία mock webhook data
        mock_subscription_created = {
            "id": "evt_test_webhook",
            "object": "event",
            "api_version": "2020-08-27",
            "created": int(datetime.now().timestamp()),
            "data": {
                "object": {
                    "id": "sub_test_123456789",
                    "object": "subscription",
                    "status": "active",
                    "current_period_start": int(datetime.now().timestamp()),
                    "current_period_end": int((datetime.now() + timedelta(days=30)).timestamp()),
                    "customer": "cus_test_123456789",
                    "items": {
                        "data": [
                            {
                                "id": "si_test_123456789",
                                "object": "subscription_item",
                                "price": {
                                    "id": "price_1SJKhx09cwMpk380JiBUE9tr",  # Starter Plan
                                    "object": "price",
                                    "unit_amount": 2900,
                                    "currency": "eur",
                                    "recurring": {
                                        "interval": "month"
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            "livemode": False,
            "pending_webhooks": 1,
            "request": {
                "id": "req_test_123456789",
                "idempotency_key": None
            },
            "type": "customer.subscription.created"
        }
        
        print("✅ Mock webhook data created")
        print(f"   - Subscription ID: {mock_subscription_created['data']['object']['id']}")
        print(f"   - Status: {mock_subscription_created['data']['object']['status']}")
        print(f"   - Price ID: {mock_subscription_created['data']['object']['items']['data'][0]['price']['id']}")
        
        # Test 2: Subscription Updated
        print("\n🔍 Test 2: Subscription Updated Webhook")
        print("-" * 40)
        
        mock_subscription_updated = {
            "id": "evt_test_webhook_updated",
            "object": "event",
            "api_version": "2020-08-27",
            "created": int(datetime.now().timestamp()),
            "data": {
                "object": {
                    "id": "sub_test_123456789",
                    "object": "subscription",
                    "status": "active",
                    "current_period_start": int(datetime.now().timestamp()),
                    "current_period_end": int((datetime.now() + timedelta(days=30)).timestamp()),
                    "customer": "cus_test_123456789",
                    "items": {
                        "data": [
                            {
                                "id": "si_test_123456789",
                                "object": "subscription_item",
                                "price": {
                                    "id": "price_1SJKhX09cwMpk380Ycb2cwCC",  # Professional Plan
                                    "object": "price",
                                    "unit_amount": 5900,
                                    "currency": "eur",
                                    "recurring": {
                                        "interval": "month"
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            "livemode": False,
            "pending_webhooks": 1,
            "request": {
                "id": "req_test_123456789_updated",
                "idempotency_key": None
            },
            "type": "customer.subscription.updated"
        }
        
        print("✅ Mock webhook data created")
        print(f"   - Subscription ID: {mock_subscription_updated['data']['object']['id']}")
        print(f"   - Status: {mock_subscription_updated['data']['object']['status']}")
        print(f"   - Price ID: {mock_subscription_updated['data']['object']['items']['data'][0]['price']['id']}")
        
        # Test 3: Subscription Deleted
        print("\n🔍 Test 3: Subscription Deleted Webhook")
        print("-" * 40)
        
        mock_subscription_deleted = {
            "id": "evt_test_webhook_deleted",
            "object": "event",
            "api_version": "2020-08-27",
            "created": int(datetime.now().timestamp()),
            "data": {
                "object": {
                    "id": "sub_test_123456789",
                    "object": "subscription",
                    "status": "canceled",
                    "current_period_start": int(datetime.now().timestamp()),
                    "current_period_end": int((datetime.now() + timedelta(days=30)).timestamp()),
                    "customer": "cus_test_123456789",
                    "canceled_at": int(datetime.now().timestamp())
                }
            },
            "livemode": False,
            "pending_webhooks": 1,
            "request": {
                "id": "req_test_123456789_deleted",
                "idempotency_key": None
            },
            "type": "customer.subscription.deleted"
        }
        
        print("✅ Mock webhook data created")
        print(f"   - Subscription ID: {mock_subscription_deleted['data']['object']['id']}")
        print(f"   - Status: {mock_subscription_deleted['data']['object']['status']}")
        
        print("\n" + "=" * 60)
        print("📋 WEBHOOK TESTING INSTRUCTIONS:")
        print("=" * 60)
        
        print("""
🎯 Για να δοκιμάσεις τα webhooks:

1. 🔗 Το Stripe CLI είναι έτοιμο και ακούει webhooks
2. 📡 Webhook endpoint: http://localhost:18000/api/billing/webhooks/stripe/
3. 🔑 Webhook secret: whsec_2b8988099271afc1aa07a56fbae06a2c6c7a05d6acbe51ca4152cb145c556502

🧪 Test Scenarios:
- Create a test subscription in Stripe Dashboard
- Update subscription plan
- Cancel subscription
- Check Django logs for webhook processing

📊 Expected Results:
- Tenant status should update automatically
- UserSubscription should be created/updated/deleted
- Middleware should respond to status changes
        """)
        
        print("\n🚀 Ready for webhook testing!")

if __name__ == "__main__":
    test_stripe_webhooks()

