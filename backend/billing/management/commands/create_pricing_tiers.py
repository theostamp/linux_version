# billing/management/commands/create_pricing_tiers.py
"""
Management command για τη δημιουργία των κλιμακωτών τιμολογίων (PricingTier).

Τιμολογιακή Πολιτική:
- Free: 1-7 διαμερίσματα → €0
- Cloud: 8-20 → €18, 21-30 → €22, 31+ → €25
- Kiosk: 8-20 → €28, 21-30 → €35, 31+ → €40

Usage:
    python manage.py create_pricing_tiers
    python manage.py create_pricing_tiers --clear  # Διαγράφει υπάρχοντα tiers πρώτα
"""

from django.core.management.base import BaseCommand
from decimal import Decimal
from billing.models import PricingTier, SubscriptionPlan


class Command(BaseCommand):
    help = 'Δημιουργεί τα κλιμακωτά τιμολόγια (PricingTier) για Free, Cloud και Kiosk'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Διαγράφει υπάρχοντα pricing tiers πριν τη δημιουργία νέων',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('📊 ΔΗΜΙΟΥΡΓΙΑ ΚΛΙΜΑΚΩΤΩΝ ΤΙΜΟΛΟΓΙΩΝ'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))

        if options['clear']:
            deleted_count = PricingTier.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'🗑️  Διαγράφηκαν {deleted_count} υπάρχοντα tiers\n'))

        # Ορισμός των pricing tiers
        pricing_data = [
            # FREE TIER
            {
                'plan_category': 'free',
                'min_apartments': 1,
                'max_apartments': 7,
                'monthly_price': Decimal('0.00'),
                'yearly_discount_percent': Decimal('0.00'),
                'display_order': 1,
            },
            
            # CLOUD TIERS
            {
                'plan_category': 'cloud',
                'min_apartments': 8,
                'max_apartments': 20,
                'monthly_price': Decimal('18.00'),
                'yearly_discount_percent': Decimal('16.67'),  # 2 μήνες δωρεάν
                'display_order': 10,
            },
            {
                'plan_category': 'cloud',
                'min_apartments': 21,
                'max_apartments': 30,
                'monthly_price': Decimal('22.00'),
                'yearly_discount_percent': Decimal('16.67'),
                'display_order': 11,
            },
            {
                'plan_category': 'cloud',
                'min_apartments': 31,
                'max_apartments': None,  # Απεριόριστα
                'monthly_price': Decimal('25.00'),
                'yearly_discount_percent': Decimal('16.67'),
                'display_order': 12,
            },
            
            # KIOSK (INFO POINT) TIERS
            {
                'plan_category': 'kiosk',
                'min_apartments': 8,
                'max_apartments': 20,
                'monthly_price': Decimal('28.00'),
                'yearly_discount_percent': Decimal('16.67'),
                'display_order': 20,
            },
            {
                'plan_category': 'kiosk',
                'min_apartments': 21,
                'max_apartments': 30,
                'monthly_price': Decimal('35.00'),
                'yearly_discount_percent': Decimal('16.67'),
                'display_order': 21,
            },
            {
                'plan_category': 'kiosk',
                'min_apartments': 31,
                'max_apartments': None,  # Απεριόριστα
                'monthly_price': Decimal('40.00'),
                'yearly_discount_percent': Decimal('16.67'),
                'display_order': 22,
            },
        ]

        created_count = 0
        updated_count = 0

        for tier_data in pricing_data:
            tier, created = PricingTier.objects.update_or_create(
                plan_category=tier_data['plan_category'],
                min_apartments=tier_data['min_apartments'],
                defaults={
                    'max_apartments': tier_data['max_apartments'],
                    'monthly_price': tier_data['monthly_price'],
                    'yearly_discount_percent': tier_data['yearly_discount_percent'],
                    'display_order': tier_data['display_order'],
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✅ Δημιουργήθηκε: {tier}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'  🔄 Ενημερώθηκε: {tier}'))

        # Δημιουργία/Ενημέρωση SubscriptionPlan records
        self.stdout.write(self.style.NOTICE('\n📋 ΕΝΗΜΕΡΩΣΗ SUBSCRIPTION PLANS\n'))

        plans_data = [
            {
                'plan_type': 'free',
                'name': 'Free',
                'description': 'Βασικό φύλλο κοινοχρήστων για μικρές πολυκατοικίες (έως 7 διαμερίσματα)',
                'monthly_price': Decimal('0.00'),
                'yearly_price': Decimal('0.00'),
                'uses_tiered_pricing': True,
                'includes_kiosk_hardware': False,
                'max_buildings_online_signup': 1,
            },
            {
                'plan_type': 'cloud',
                'name': 'Concierge Cloud',
                'description': 'Πλήρης πλατφόρμα διαχείρισης πολυκατοικίας χωρίς Kiosk hardware',
                'monthly_price': Decimal('18.00'),  # Base tier price
                'yearly_price': Decimal('180.00'),
                'uses_tiered_pricing': True,
                'includes_kiosk_hardware': False,
                'max_buildings_online_signup': 5,
            },
            {
                'plan_type': 'kiosk',
                'name': 'Info Point',
                'description': 'Πλήρης πλατφόρμα με σημείο ενημέρωσης (οθόνη) στην είσοδο',
                'monthly_price': Decimal('28.00'),  # Base tier price
                'yearly_price': Decimal('280.00'),
                'uses_tiered_pricing': True,
                'includes_kiosk_hardware': True,
                'max_buildings_online_signup': 5,
            },
        ]

        for plan_data in plans_data:
            plan, created = SubscriptionPlan.objects.update_or_create(
                plan_type=plan_data['plan_type'],
                defaults={
                    'name': plan_data['name'],
                    'description': plan_data['description'],
                    'monthly_price': plan_data['monthly_price'],
                    'yearly_price': plan_data['yearly_price'],
                    'uses_tiered_pricing': plan_data['uses_tiered_pricing'],
                    'includes_kiosk_hardware': plan_data['includes_kiosk_hardware'],
                    'max_buildings_online_signup': plan_data['max_buildings_online_signup'],
                    'is_active': True,
                }
            )

            status = '✅ Δημιουργήθηκε' if created else '🔄 Ενημερώθηκε'
            self.stdout.write(self.style.SUCCESS(f'  {status}: {plan.name}'))

        # Εκτύπωση συνοπτικού πίνακα
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('📊 ΣΥΝΟΠΤΙΚΟΣ ΠΙΝΑΚΑΣ ΤΙΜΟΛΟΓΗΣΗΣ'))
        self.stdout.write(self.style.NOTICE('='*60))
        
        self.stdout.write('\n┌─────────────┬──────────────┬────────────┬────────────┐')
        self.stdout.write('│ Διαμερίσμ.  │ 🆓 Free      │ ☁️ Cloud   │ 📺 Kiosk   │')
        self.stdout.write('├─────────────┼──────────────┼────────────┼────────────┤')
        self.stdout.write('│   1-7       │     €0       │     -      │     -      │')
        self.stdout.write('│   8-20      │     -        │    €18     │    €28     │')
        self.stdout.write('│  21-30      │     -        │    €22     │    €35     │')
        self.stdout.write('│   31+       │     -        │    €25     │    €40     │')
        self.stdout.write('└─────────────┴──────────────┴────────────┴────────────┘\n')

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Ολοκληρώθηκε! Δημιουργήθηκαν {created_count} νέα tiers, '
            f'ενημερώθηκαν {updated_count} υπάρχοντα.\n'
        ))

