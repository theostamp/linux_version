"""
Management command to backfill payer_responsibility for existing expenses based on category defaults.

Usage:
    python manage.py backfill_payer_responsibility
    python manage.py backfill_payer_responsibility --dry-run
    python manage.py backfill_payer_responsibility --building-id 1
"""

from django.core.management.base import BaseCommand
from financial.models import Expense


class Command(BaseCommand):
    help = 'Backfills payer_responsibility for existing expenses based on category defaults'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating',
        )
        parser.add_argument(
            '--building-id',
            type=int,
            help='Only process expenses for a specific building',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        building_id = options.get('building_id')
        
        # Find all expenses without payer_responsibility or with default 'resident' that should be updated
        queryset = Expense.objects.all()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        # Find expenses that need updating
        expenses_to_update = []
        for expense in queryset:
            # Get default payer for this category
            default_payer = Expense.get_default_payer_for_category(expense.category)
            
            # Update if:
            # 1. payer_responsibility is None (shouldn't happen but check anyway)
            # 2. payer_responsibility is 'resident' (default) but category default is different
            if expense.payer_responsibility != default_payer:
                expenses_to_update.append((expense, default_payer))
        
        count = len(expenses_to_update)
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ All expenses have correct payer_responsibility'))
            return
        
        self.stdout.write(f"Found {count} expense(s) that need payer_responsibility update:")
        
        # Group by category for summary
        category_counts = {}
        for expense, default_payer in expenses_to_update[:20]:  # Show first 20
            self.stdout.write(
                f"  - ID: {expense.id}, Building: {expense.building.name}, "
                f"Category: {expense.category}, Date: {expense.date}, Amount: €{expense.amount}, "
                f"Current: {expense.payer_responsibility} → New: {default_payer}"
            )
            category_counts[expense.category] = category_counts.get(expense.category, 0) + 1
        
        if count > 20:
            self.stdout.write(f"  ... and {count - 20} more expenses")
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN - No changes made'))
            self.stdout.write(f"Would update {count} expense(s)")
            self.stdout.write('\n📊 Summary by category:')
            for category, cat_count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
                default_payer = Expense.get_default_payer_for_category(category)
                self.stdout.write(f"  - {category}: {cat_count} expense(s) → {default_payer}")
            return
        
        # Update expenses
        updated_count = 0
        for expense, default_payer in expenses_to_update:
            expense.payer_responsibility = default_payer
            expense.save(update_fields=['payer_responsibility'])
            updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully updated {updated_count} expense(s)'
            )
        )
        
        # Show summary
        self.stdout.write('\n📊 Summary:')
        total_expenses = queryset.count()
        owner_expenses = queryset.filter(payer_responsibility='owner').count()
        resident_expenses = queryset.filter(payer_responsibility='resident').count()
        shared_expenses = queryset.filter(payer_responsibility='shared').count()
        
        self.stdout.write(f'  - Total expenses: {total_expenses}')
        self.stdout.write(f'  - With payer=owner: {owner_expenses}')
        self.stdout.write(f'  - With payer=resident: {resident_expenses}')
        self.stdout.write(f'  - With payer=shared: {shared_expenses}')

