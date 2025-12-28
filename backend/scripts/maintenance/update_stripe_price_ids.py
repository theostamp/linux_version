#!/usr/bin/env python
"""
Script για ενημέρωση Stripe Price IDs στα Django subscription plans
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from billing.models import SubscriptionPlan
from django_tenants.utils import schema_context

def update_price_ids():
    """Ενημέρωση Stripe Price IDs στα subscription plans"""
    
    print("🔗 Ενημέρωση Stripe Price IDs")
    print("=" * 50)
    
    with schema_context('demo'):
        # Εμφάνιση τρέχοντα plans
        print("📋 Τρέχοντα Subscription Plans:")
        print("-" * 50)
        for plan in SubscriptionPlan.objects.all():
            print(f"• {plan.name}")
            print(f"  - Price: €{plan.monthly_price}/μήνα")
            print(f"  - Stripe Price ID: {getattr(plan, 'stripe_price_id_monthly', 'Not set')}")
            print()
        
        print("🔑 Παρακαλώ εισάγετε τα Stripe Price IDs:")
        print("(Αντιγράψε τα από το Stripe Dashboard)")
        print()
        
        # Starter Plan
        starter_price_id = input("Starter Plan Price ID (price_...): ").strip()
        if starter_price_id:
            try:
                starter_plan = SubscriptionPlan.objects.get(name='Starter Plan')
                starter_plan.stripe_price_id_monthly = starter_price_id
                starter_plan.save()
                print("✅ Starter Plan ενημερώθηκε!")
            except SubscriptionPlan.DoesNotExist:
                print("❌ Starter Plan δεν βρέθηκε!")
        
        # Professional Plan
        professional_price_id = input("Professional Plan Price ID (price_...): ").strip()
        if professional_price_id:
            try:
                professional_plan = SubscriptionPlan.objects.get(name='Professional Plan')
                professional_plan.stripe_price_id_monthly = professional_price_id
                professional_plan.save()
                print("✅ Professional Plan ενημερώθηκε!")
            except SubscriptionPlan.DoesNotExist:
                print("❌ Professional Plan δεν βρέθηκε!")
        
        # Enterprise Plan
        enterprise_price_id = input("Enterprise Plan Price ID (price_...): ").strip()
        if enterprise_price_id:
            try:
                enterprise_plan = SubscriptionPlan.objects.get(name='Enterprise Plan')
                enterprise_plan.stripe_price_id_monthly = enterprise_price_id
                enterprise_plan.save()
                print("✅ Enterprise Plan ενημερώθηκε!")
            except SubscriptionPlan.DoesNotExist:
                print("❌ Enterprise Plan δεν βρέθηκε!")
        
        print("\n📋 Ενημερωμένα Plans:")
        print("-" * 50)
        for plan in SubscriptionPlan.objects.all():
            print(f"• {plan.name}")
            print(f"  - Price: €{plan.monthly_price}/μήνα")
            print(f"  - Stripe Price ID: {getattr(plan, 'stripe_price_id_monthly', 'Not set')}")
            print()
        
        print("🎯 Επόμενα βήματα:")
        print("1. Restart το σύστημα: ./reset_and_start.sh")
        print("2. Test τη ροή εγγραφής → συνδρομή → πρόσβαση")
        print("3. Χρησιμοποίησε test card numbers από το Stripe")

if __name__ == "__main__":
    update_price_ids()

