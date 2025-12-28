#!/usr/bin/env python
"""
Script για δημιουργία Stripe products στο Django admin
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from billing.models import SubscriptionPlan
from django.conf import settings
from django_tenants.utils import schema_context

def create_subscription_plans():
    """Δημιουργία των 3 subscription plans"""
    
    print("🚀 Δημιουργία Subscription Plans")
    print("=" * 50)
    
    # Δημιουργία στο public schema (για όλους τους tenants)
    with schema_context('public'):
        # Starter Plan
        starter_plan, created = SubscriptionPlan.objects.get_or_create(
        name='Starter',
        defaults={
            'description': 'Βασικό πλάνο για μικρές πολυκατοικίες',
            'price': 19.99,
            'currency': 'EUR',
            'billing_cycle': 'monthly',
            'max_apartments': 20,
            'max_users': 5,
            'features': {
                'basic_management': True,
                'financial_tracking': True,
                'maintenance_requests': True,
                'document_storage': '1GB',
                'email_support': True,
                'advanced_analytics': False,
                'api_access': False,
                'priority_support': False
            },
            'is_active': True,
            'is_popular': False
        }
    )
    
    if created:
        print("✅ Δημιουργήθηκε το Starter Plan")
    else:
        print("ℹ️  Το Starter Plan υπάρχει ήδη")
    
    # Professional Plan
    professional_plan, created = SubscriptionPlan.objects.get_or_create(
        name='Professional',
        defaults={
            'description': 'Επαγγελματικό πλάνο με προηγμένες λειτουργίες',
            'price': 49.99,
            'currency': 'EUR',
            'billing_cycle': 'monthly',
            'max_apartments': 100,
            'max_users': 20,
            'features': {
                'basic_management': True,
                'financial_tracking': True,
                'maintenance_requests': True,
                'document_storage': '10GB',
                'email_support': True,
                'advanced_analytics': True,
                'api_access': True,
                'priority_support': True
            },
            'is_active': True,
            'is_popular': True  # Το πιο δημοφιλές
        }
    )
    
    if created:
        print("✅ Δημιουργήθηκε το Professional Plan")
    else:
        print("ℹ️  Το Professional Plan υπάρχει ήδη")
    
    # Enterprise Plan
    enterprise_plan, created = SubscriptionPlan.objects.get_or_create(
        name='Enterprise',
        defaults={
            'description': 'Επιχειρηματικό πλάνο με πλήρη υποστήριξη',
            'price': 99.99,
            'currency': 'EUR',
            'billing_cycle': 'monthly',
            'max_apartments': -1,  # Unlimited
            'max_users': -1,       # Unlimited
            'features': {
                'basic_management': True,
                'financial_tracking': True,
                'maintenance_requests': True,
                'document_storage': 'unlimited',
                'email_support': True,
                'advanced_analytics': True,
                'api_access': True,
                'priority_support': True,
                'dedicated_support': True,
                'custom_integrations': True
            },
            'is_active': True,
            'is_popular': False
        }
    )
    
    if created:
        print("✅ Δημιουργήθηκε το Enterprise Plan")
    else:
        print("ℹ️  Το Enterprise Plan υπάρχει ήδη")
    
    print("\n📋 Σύνοψη Plans:")
    print("-" * 50)
    for plan in SubscriptionPlan.objects.all():
        print(f"• {plan.name}: €{plan.price}/{plan.billing_cycle}")
        print(f"  - Apartments: {plan.max_apartments if plan.max_apartments > 0 else 'Unlimited'}")
        print(f"  - Users: {plan.max_users if plan.max_users > 0 else 'Unlimited'}")
        print(f"  - Popular: {'Yes' if plan.is_popular else 'No'}")
        print()
    
    print("🎯 Επόμενα βήματα:")
    print("1. Δημιούργησε τα προϊόντα στο Stripe Dashboard")
    print("2. Αντιγράψε τα Price IDs από το Stripe")
    print("3. Ενημέρωσε τα plans στο Django admin με τα Price IDs")
    print("4. Test τη ροή εγγραφής → συνδρομή")

if __name__ == "__main__":
    create_subscription_plans()
