#!/usr/bin/env python
"""
Create Stripe Prices for Subscription Plans
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

import stripe
from django.conf import settings
from billing.models import SubscriptionPlan

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

def create_stripe_prices():
    """Create Stripe prices for all subscription plans"""
    
    print("=" * 70)
    print("  💳 CREATING STRIPE PRICES")
    print("=" * 70)
    print()
    
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not configured!")
        return
    
    plans = SubscriptionPlan.objects.filter(is_active=True)
    
    for plan in plans:
        print(f"📦 Processing plan: {plan.name}")
        
        # Create Stripe Product if needed
        if not plan.stripe_product_id:
            try:
                product = stripe.Product.create(
                    name=plan.name,
                    description=plan.description,
                    metadata={
                        'plan_id': str(plan.id),
                        'plan_type': plan.plan_type
                    }
                )
                plan.stripe_product_id = product.id
                print(f"   ✅ Created Stripe Product: {product.id}")
            except Exception as e:
                print(f"   ❌ Failed to create product: {e}")
                continue
        else:
            print(f"   ℹ️  Product already exists: {plan.stripe_product_id}")
        
        # Create Monthly Price
        if not plan.stripe_price_id_monthly:
            try:
                monthly_price = stripe.Price.create(
                    product=plan.stripe_product_id,
                    unit_amount=int(float(plan.monthly_price) * 100),  # Convert to cents
                    currency='eur',
                    recurring={'interval': 'month'},
                    metadata={
                        'plan_id': str(plan.id),
                        'billing_period': 'monthly'
                    }
                )
                plan.stripe_price_id_monthly = monthly_price.id
                print(f"   ✅ Created Monthly Price: {monthly_price.id} (€{plan.monthly_price}/month)")
            except Exception as e:
                print(f"   ❌ Failed to create monthly price: {e}")
        else:
            print(f"   ℹ️  Monthly price already exists: {plan.stripe_price_id_monthly}")
        
        # Create Yearly Price
        if not plan.stripe_price_id_yearly:
            try:
                yearly_price = stripe.Price.create(
                    product=plan.stripe_product_id,
                    unit_amount=int(float(plan.yearly_price) * 100),  # Convert to cents
                    currency='eur',
                    recurring={'interval': 'year'},
                    metadata={
                        'plan_id': str(plan.id),
                        'billing_period': 'yearly'
                    }
                )
                plan.stripe_price_id_yearly = yearly_price.id
                print(f"   ✅ Created Yearly Price: {yearly_price.id} (€{plan.yearly_price}/year)")
            except Exception as e:
                print(f"   ❌ Failed to create yearly price: {e}")
        else:
            print(f"   ℹ️  Yearly price already exists: {plan.stripe_price_id_yearly}")
        
        # Save the plan
        plan.save()
        print(f"   💾 Plan saved with Stripe IDs")
        print()
    
    print("=" * 70)
    print("  ✅ STRIPE PRICES CREATED SUCCESSFULLY!")
    print("=" * 70)
    print()
    
    # Summary
    print("📊 Summary:")
    for plan in SubscriptionPlan.objects.filter(is_active=True):
        print(f"   {plan.name}:")
        print(f"      Product ID: {plan.stripe_product_id or 'MISSING'}")
        print(f"      Monthly Price ID: {plan.stripe_price_id_monthly or 'MISSING'}")
        print(f"      Yearly Price ID: {plan.stripe_price_id_yearly or 'MISSING'}")
        print()

if __name__ == '__main__':
    create_stripe_prices()

