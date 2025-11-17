"""
Management command to clean up orphan expenses
(expenses linked to deleted ScheduledMaintenance tasks)
"""

from django.core.management.base import BaseCommand
from financial.models import Expense
from maintenance.models import ScheduledMaintenance


class Command(BaseCommand):
    help = 'Clean up orphan expenses (expenses linked to deleted ScheduledMaintenance tasks)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--building',
            type=int,
            help='Only process expenses for specific building ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        building_id = options.get('building')

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - No changes will be made'))
        else:
            self.stdout.write(self.style.WARNING('⚠️  LIVE MODE - Changes will be applied!'))

        # Find all expenses that reference "προγραμματισμένο έργο #<id>" in notes
        # but the referenced ScheduledMaintenance no longer exists
        
        expenses_query = Expense.objects.filter(
            notes__icontains='προγραμματισμένο έργο #'
        )
        
        if building_id:
            expenses_query = expenses_query.filter(building_id=building_id)
            self.stdout.write(f'Filtering by building ID: {building_id}')

        total_expenses = expenses_query.count()
        self.stdout.write(f'\n📊 Found {total_expenses} expenses with maintenance references\n')

        orphan_expenses = []
        
        for expense in expenses_query:
            # Extract maintenance ID from notes
            # Format: "προγραμματισμένο έργο #123"
            import re
            match = re.search(r'προγραμματισμένο έργο #(\d+)', expense.notes or '')
            
            if match:
                maintenance_id = int(match.group(1))
                
                # Check if ScheduledMaintenance exists
                if not ScheduledMaintenance.objects.filter(id=maintenance_id).exists():
                    orphan_expenses.append({
                        'expense': expense,
                        'maintenance_id': maintenance_id,
                    })

        orphan_count = len(orphan_expenses)
        
        if orphan_count == 0:
            self.stdout.write(self.style.SUCCESS('✅ No orphan expenses found!'))
            return

        self.stdout.write(
            self.style.WARNING(f'\n⚠️  Found {orphan_count} orphan expenses:\n')
        )

        total_amount = 0
        for item in orphan_expenses:
            expense = item['expense']
            maintenance_id = item['maintenance_id']
            total_amount += float(expense.amount or 0)
            
            self.stdout.write(
                f'  • Expense #{expense.id}: {expense.title or "Χωρίς τίτλο"} '
                f'(€{expense.amount}) - References deleted maintenance #{maintenance_id}'
            )

        self.stdout.write(f'\n💰 Total amount: €{total_amount:,.2f}\n')

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Dry run complete. {orphan_count} expenses would be deleted.'
                )
            )
        else:
            # Confirm deletion
            confirm = input(
                f'\n⚠️  Are you sure you want to delete {orphan_count} expenses? '
                'Type "yes" to confirm: '
            )
            
            if confirm.lower() == 'yes':
                deleted_count = 0
                for item in orphan_expenses:
                    expense = item['expense']
                    expense_id = expense.id
                    expense.delete()
                    deleted_count += 1
                    self.stdout.write(f'  ✓ Deleted expense #{expense_id}')
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n✅ Successfully deleted {deleted_count} orphan expenses!'
                    )
                )
            else:
                self.stdout.write(self.style.ERROR('❌ Deletion cancelled.'))

