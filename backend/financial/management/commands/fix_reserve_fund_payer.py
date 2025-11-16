"""
Management command to fix payer_responsibility for existing reserve_fund expenses.

Usage:
    python manage.py fix_reserve_fund_payer
    python manage.py fix_reserve_fund_payer --dry-run
"""

from django.core.management.base import BaseCommand
from financial.models import Expense


class Command(BaseCommand):
    help = 'Fixes payer_responsibility for existing reserve_fund expenses (should be owner, not resident)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find all reserve_fund expenses with wrong payer_responsibility
        wrong_payer_expenses = Expense.objects.filter(
            category='reserve_fund'
        ).exclude(
            payer_responsibility='owner'
        )
        
        count = wrong_payer_expenses.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ All reserve_fund expenses have correct payer_responsibility'))
            return
        
        self.stdout.write(f"Found {count} reserve_fund expenses with wrong payer_responsibility:")
        
        for expense in wrong_payer_expenses:
            self.stdout.write(
                f"  - ID: {expense.id}, Building: {expense.building.name}, "
                f"Date: {expense.date}, Amount: €{expense.amount}, "
                f"Current payer: {expense.payer_responsibility}"
            )
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN - No changes made'))
            self.stdout.write(f"Would update {count} expense(s) to payer_responsibility='owner'")
            return
        
        # Update all wrong payer expenses
        updated_count = wrong_payer_expenses.update(payer_responsibility='owner')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully updated {updated_count} reserve_fund expense(s) to payer_responsibility="owner"'
            )
        )
        
        # Show summary
        self.stdout.write('\n📊 Summary:')
        self.stdout.write(f'  - Total reserve_fund expenses: {Expense.objects.filter(category="reserve_fund").count()}')
        self.stdout.write(f'  - With payer=owner: {Expense.objects.filter(category="reserve_fund", payer_responsibility="owner").count()}')
        self.stdout.write(f'  - With payer=resident: {Expense.objects.filter(category="reserve_fund", payer_responsibility="resident").count()}')
        self.stdout.write(f'  - With payer=shared: {Expense.objects.filter(category="reserve_fund", payer_responsibility="shared").count()}')

