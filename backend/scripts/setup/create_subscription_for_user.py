#!/usr/bin/env python
"""
Script για δημιουργία subscription για συγκεκριμένο χρήστη
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from billing.models import SubscriptionPlan, UserSubscription

User = get_user_model()

def create_subscription_for_user(email, plan_type='starter'):
    """
    Δημιουργία subscription για συγκεκριμένο χρήστη
    
    Args:
        email: Email του χρήστη
        plan_type: Τύπος plan ('starter', 'professional', 'enterprise')
    """
    
    print(f"🔍 Αναζήτηση χρήστη: {email}")
    
    try:
        user = User.objects.get(email=email)
        print(f"✅ Βρέθηκε χρήστης: {user.email}")
    except User.DoesNotExist:
        print(f"❌ Δεν βρέθηκε χρήστης με email: {email}")
        return False
    
    # Έλεγχος αν έχει ήδη active subscription
    existing_subscription = UserSubscription.objects.filter(
        user=user,
        status__in=['trial', 'active']
    ).first()
    
    if existing_subscription:
        print(f"⚠️ Ο χρήστης έχει ήδη active subscription: {existing_subscription.plan.name}")
        return existing_subscription
    
    # Βρες το plan
    try:
        plan = SubscriptionPlan.objects.get(plan_type=plan_type, is_active=True)
        print(f"✅ Βρέθηκε plan: {plan.name}")
    except SubscriptionPlan.DoesNotExist:
        print(f"❌ Δεν βρέθηκε active plan με τύπο: {plan_type}")
        return False
    
    # Δημιουργία subscription
    now = timezone.now()
    trial_end = now + timedelta(days=plan.trial_days)
    current_period_end = now + timedelta(days=30)  # Monthly billing
    
    subscription = UserSubscription.objects.create(
        user=user,
        plan=plan,
        status='trial',
        billing_interval='month',
        trial_start=now,
        trial_end=trial_end,
        current_period_start=now,
        current_period_end=current_period_end,
        price=plan.monthly_price,
        currency='EUR',
        tenant_domain=f"{email.split('@')[0]}.localhost"
    )
    
    print(f"✅ Δημιουργήθηκε subscription:")
    print(f"   📧 User: {user.email}")
    print(f"   📦 Plan: {plan.name}")
    print(f"   📅 Status: {subscription.status}")
    print(f"   🆓 Trial until: {trial_end.strftime('%Y-%m-%d %H:%M')}")
    print(f"   💰 Price: €{plan.monthly_price}/month")
    print(f"   🌐 Domain: {subscription.tenant_domain}")
    
    return subscription

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Χρήση: python create_subscription_for_user.py <email> [plan_type]")
        print("Παραδείγματα:")
        print("  python create_subscription_for_user.py etherm2021@gmail.com")
        print("  python create_subscription_for_user.py etherm2021@gmail.com starter")
        print("  python create_subscription_for_user.py etherm2021@gmail.com professional")
        return
    
    email = sys.argv[1]
    plan_type = sys.argv[2] if len(sys.argv) > 2 else 'starter'
    
    print("🚀 ΔΗΜΙΟΥΡΓΙΑ SUBSCRIPTION")
    print("=" * 50)
    
    subscription = create_subscription_for_user(email, plan_type)
    
    if subscription:
        print("\n✅ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("🎉 Ο χρήστης τώρα έχει active subscription!")
    else:
        print("\n❌ ΑΠΕΤΥΧΕ!")
        print("💡 Ελέγξτε τα logs παραπάνω για λεπτομέρειες.")

if __name__ == "__main__":
    main()
