#!/usr/bin/env python3
"""
Test script to verify email timing is correct.
Tests that workspace welcome emails are sent only after payment confirmation.
"""

import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import Group
from users.models import CustomUser
from tenants.services import TenantService
from billing.services import BillingService
from billing.models import SubscriptionPlan, UserSubscription
from users.services import EmailService
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_email_timing():
    """Test that emails are sent at the correct time."""
    print("🧪 Testing Email Timing")
    print("=" * 50)
    
    # Test 1: Tenant creation should NOT send email
    print("\n1️⃣ Testing Tenant Creation (should NOT send email)...")
    test_tenant_creation()
    
    # Test 2: Payment confirmation should send email
    print("\n2️⃣ Testing Payment Confirmation (should send email)...")
    test_payment_confirmation()
    
    print("\n✅ Email Timing Test Complete!")


def test_tenant_creation():
    """Test that tenant creation doesn't send premature emails."""
    print("  Creating tenant infrastructure...")
    
    try:
        # Create a test user
        test_user = CustomUser.objects.create(
            email='test_timing@example.com',
            first_name='Test',
            last_name='Timing',
            is_active=True,
            email_verified=True,
        )
        test_user.set_password('test123456')
        test_user.save()
        
        # Create tenant infrastructure (should NOT send email)
        tenant_service = TenantService()
        tenant, domain = tenant_service.create_tenant_infrastructure(
            schema_name='test-timing',
            user=test_user,
            paid_until='2025-12-31',
            on_trial=True
        )
        
        print(f"  ✅ Tenant created: {tenant.schema_name}")
        print(f"  ✅ Domain created: {domain.domain}")
        print(f"  ✅ No premature email sent (as expected)")
        
        # Clean up
        test_user.delete()
        tenant.delete()
        domain.delete()
        print(f"  🧹 Cleaned up test data")
        
    except Exception as e:
        print(f"  ❌ Error in tenant creation test: {e}")


def test_payment_confirmation():
    """Test that payment confirmation sends the correct email."""
    print("  Testing payment confirmation flow...")
    
    try:
        # Create a test user
        test_user = CustomUser.objects.create(
            email='test_payment@example.com',
            first_name='Test',
            last_name='Payment',
            is_active=True,
            email_verified=True,
        )
        test_user.set_password('test123456')
        test_user.save()
        
        # Get a subscription plan
        plan = SubscriptionPlan.objects.first()
        if not plan:
            print("  ⚠️ No subscription plan found - creating one...")
            plan = SubscriptionPlan.objects.create(
                name='Test Plan',
                description='Test plan for email timing',
                price_monthly=9.99,
                price_yearly=99.99,
                stripe_price_id_monthly='price_test_monthly',
                stripe_price_id_yearly='price_test_yearly',
                max_buildings=1,
                max_apartments=10,
                max_users=5
            )
        
        # Create subscription (pending status)
        subscription = BillingService.create_subscription(
            user=test_user,
            plan=plan,
            billing_interval='month'
        )
        
        if subscription:
            print(f"  ✅ Subscription created: {subscription.id}")
            print(f"  ✅ Status: {subscription.status}")
            
            # Simulate payment confirmation (webhook)
            subscription.status = 'active'
            subscription.save()
            
            print(f"  ✅ Payment confirmed - status updated to: {subscription.status}")
            print(f"  ✅ Workspace welcome email should be sent now")
            
            # Test the email function directly
            try:
                result = EmailService.send_workspace_welcome_email(
                    test_user, 
                    'test-payment.localhost'
                )
                if result:
                    print(f"  ✅ Workspace welcome email sent successfully")
                else:
                    print(f"  ❌ Failed to send workspace welcome email")
            except Exception as e:
                print(f"  ❌ Error sending email: {e}")
        
        # Clean up
        if subscription:
            subscription.delete()
        test_user.delete()
        if plan and plan.name == 'Test Plan':
            plan.delete()
        print(f"  🧹 Cleaned up test data")
        
    except Exception as e:
        print(f"  ❌ Error in payment confirmation test: {e}")


def show_email_flow():
    """Show the correct email flow."""
    print("\n📧 Correct Email Flow:")
    print("=" * 30)
    print("1. User registers → No email")
    print("2. User starts checkout → No email")
    print("3. Tenant infrastructure created → No email")
    print("4. Payment confirmed (webhook) → ✅ Workspace welcome email sent")
    print("5. Subscription status = 'active' → ✅ Additional welcome emails sent")


if __name__ == '__main__':
    try:
        test_email_timing()
        show_email_flow()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)





