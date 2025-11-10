"""
Django management command to create Stripe Prices for Subscription Plans
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import stripe
from billing.models import SubscriptionPlan
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create Stripe Products and Prices for all subscription plans'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing prices'
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  💳 CREATING STRIPE PRICES'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write('')
        
        # Initialize Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        if not stripe.api_key:
            self.stdout.write(self.style.ERROR('❌ STRIPE_SECRET_KEY not configured!'))
            return
        
        plans = SubscriptionPlan.objects.filter(is_active=True)
        
        for plan in plans:
            self.stdout.write(f'📦 Processing plan: {plan.name}')
            
            # Create Stripe Product if needed
            if not plan.stripe_product_id or force:
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
                    self.stdout.write(f'   ✅ Created Stripe Product: {product.id}')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'   ❌ Failed to create product: {e}'))
                    continue
            else:
                self.stdout.write(f'   ℹ️  Product already exists: {plan.stripe_product_id}')
            
            # Create Monthly Price
            if not plan.stripe_price_id_monthly or force:
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
                    self.stdout.write(f'   ✅ Created Monthly Price: {monthly_price.id} (€{plan.monthly_price}/month)')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'   ❌ Failed to create monthly price: {e}'))
            else:
                self.stdout.write(f'   ℹ️  Monthly price already exists: {plan.stripe_price_id_monthly}')
            
            # Create Yearly Price
            if not plan.stripe_price_id_yearly or force:
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
                    self.stdout.write(f'   ✅ Created Yearly Price: {yearly_price.id} (€{plan.yearly_price}/year)')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'   ❌ Failed to create yearly price: {e}'))
            else:
                self.stdout.write(f'   ℹ️  Yearly price already exists: {plan.stripe_price_id_yearly}')
            
            # Save the plan
            plan.save()
            self.stdout.write(f'   💾 Plan saved with Stripe IDs')
            self.stdout.write('')
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  ✅ STRIPE PRICES CREATED SUCCESSFULLY!'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write('')
        
        # Summary
        self.stdout.write('📊 Summary:')
        for plan in SubscriptionPlan.objects.filter(is_active=True):
            self.stdout.write(f'   {plan.name}:')
            self.stdout.write(f'      Product ID: {plan.stripe_product_id or "MISSING"}')
            self.stdout.write(f'      Monthly Price ID: {plan.stripe_price_id_monthly or "MISSING"}')
            self.stdout.write(f'      Yearly Price ID: {plan.stripe_price_id_yearly or "MISSING"}')
            self.stdout.write('')

