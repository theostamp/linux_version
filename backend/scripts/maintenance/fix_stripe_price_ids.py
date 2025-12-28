#!/usr/bin/env python3
"""
Quick fix script to add mock Stripe price IDs for development
This allows the subscription system to work without requiring actual Stripe setup
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from billing.models import SubscriptionPlan

def fix_stripe_price_ids():
    """Add mock Stripe price IDs for development"""
    
    print("🔧 Fixing Stripe Price IDs for Development...")
    
    # Mock price IDs for development (these are fake but follow Stripe format)
    mock_price_ids = {
        'starter': {
            'monthly': 'price_starter_monthly_dev',
            'yearly': 'price_starter_yearly_dev'
        },
        'professional': {
            'monthly': 'price_professional_monthly_dev', 
            'yearly': 'price_professional_yearly_dev'
        },
        'enterprise': {
            'monthly': 'price_enterprise_monthly_dev',
            'yearly': 'price_enterprise_yearly_dev'
        }
    }
    
    # Update each plan
    for plan in SubscriptionPlan.objects.all():
        if plan.plan_type in mock_price_ids:
            plan.stripe_price_id_monthly = mock_price_ids[plan.plan_type]['monthly']
            plan.stripe_price_id_yearly = mock_price_ids[plan.plan_type]['yearly']
            plan.save()
            print(f"✅ Updated {plan.name} with mock price IDs")
        else:
            print(f"⚠️  Unknown plan type: {plan.plan_type}")
    
    print("\n🎉 All subscription plans now have mock Stripe price IDs!")
    print("📝 Note: These are development-only IDs. For production, you need real Stripe price IDs.")
    
    # Verify the fix
    print("\n📋 Verification:")
    for plan in SubscriptionPlan.objects.all():
        print(f"  {plan.name}: Monthly={plan.stripe_price_id_monthly}, Yearly={plan.stripe_price_id_yearly}")

if __name__ == "__main__":
    fix_stripe_price_ids()
