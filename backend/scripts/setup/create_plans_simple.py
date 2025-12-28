#!/usr/bin/env python
"""
Απλό script για δημιουργία subscription plans
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from billing.models import SubscriptionPlan
from django_tenants.utils import schema_context

def create_plans():
    """Δημιουργία subscription plans στο public schema"""
    
    print("🚀 Δημιουργία Subscription Plans")
    print("=" * 50)
    
    with schema_context('public'):
        # Starter Plan
        starter, created = SubscriptionPlan.objects.get_or_create(
            name='Starter',
            defaults={
                'description': 'Βασικό πλάνο για μικρές πολυκατοικίες',
                'monthly_price': 19.99,
                'yearly_price': 199.99,
                'currency': 'EUR',
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
        print(f"{'✅' if created else 'ℹ️ '} Starter Plan")
        
        # Professional Plan
        professional, created = SubscriptionPlan.objects.get_or_create(
            name='Professional',
            defaults={
                'description': 'Επαγγελματικό πλάνο με προηγμένες λειτουργίες',
                'monthly_price': 49.99,
                'yearly_price': 499.99,
                'currency': 'EUR',
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
                'is_popular': True
            }
        )
        print(f"{'✅' if created else 'ℹ️ '} Professional Plan")
        
        # Enterprise Plan
        enterprise, created = SubscriptionPlan.objects.get_or_create(
            name='Enterprise',
            defaults={
                'description': 'Επιχειρηματικό πλάνο με πλήρη υποστήριξη',
                'monthly_price': 99.99,
                'yearly_price': 999.99,
                'currency': 'EUR',
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
        print(f"{'✅' if created else 'ℹ️ '} Enterprise Plan")
        
        print("\n📋 Σύνοψη Plans:")
        print("-" * 50)
        for plan in SubscriptionPlan.objects.all():
            print(f"• {plan.name}: €{plan.monthly_price}/μήνα")
            print(f"  - Apartments: {plan.max_apartments if plan.max_apartments > 0 else 'Unlimited'}")
            print(f"  - Users: {plan.max_users if plan.max_users > 0 else 'Unlimited'}")
            print(f"  - Popular: {'Yes' if plan.is_popular else 'No'}")
            print()

if __name__ == "__main__":
    create_plans()

