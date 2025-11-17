"""
Management command to fix payer_responsibility for project expenses.
Specifically fixes "Επισκευή Όψεων Κτιρίου" expenses for Βουλής 6 -Demo building.

Usage:
    # Dry run to see what would be updated
    python manage.py fix_project_expense_payer --dry-run
    
    # Fix expenses for default building and title
    python manage.py fix_project_expense_payer
    
    # Fix expenses with custom building and title
    python manage.py fix_project_expense_payer --building "Βουλής 6" --title "Επισκευή Όψεων"
    
    # Fix expenses including all related advance payments
    python manage.py fix_project_expense_payer --all-related
    
    # Fix expenses with custom notes pattern for related expenses
    python manage.py fix_project_expense_payer --all-related --notes-pattern "Προκαταβολή"
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from financial.models import Expense


class Command(BaseCommand):
    help = 'Fixes payer_responsibility for project expenses (should be owner, not resident)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating',
        )
        parser.add_argument(
            '--building',
            type=str,
            help='Building name to filter (e.g., "Βουλής 6")',
            default='Βουλής 6',
        )
        parser.add_argument(
            '--title',
            type=str,
            help='Title pattern to match (e.g., "Επισκευή Όψεων")',
            default='Επισκευή Όψεων',
        )
        parser.add_argument(
            '--all-related',
            action='store_true',
            help='Also find all related expenses (advance payments) for the same project',
        )
        parser.add_argument(
            '--notes-pattern',
            type=str,
            help='Notes pattern to match for finding related expenses (e.g., "Προκαταβολή")',
            default='Προκαταβολή',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        building_name = options['building']
        title_pattern = options['title']
        all_related = options['all_related']
        notes_pattern = options['notes_pattern']
        
        # Find expenses matching the criteria
        # 1. Building name contains the pattern
        # 2. Title contains the pattern (for project expenses)
        # 3. Category is maintenance_project or project
        # 4. Currently set to 'resident' (wrong)
        
        base_query = Expense.objects.filter(
            building__name__icontains=building_name,
            payer_responsibility='resident'
        ).filter(
            Q(category='maintenance_project') | Q(category='project')
        )
        
        # If all_related is True, also find expenses with matching notes pattern
        if all_related:
            wrong_payer_expenses = base_query.filter(
                Q(title__icontains=title_pattern) | Q(notes__icontains=notes_pattern)
            )
        else:
            wrong_payer_expenses = base_query.filter(
                title__icontains=title_pattern
            )
        
        count = wrong_payer_expenses.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ No expenses found matching building "{building_name}" '
                    f'and title "{title_pattern}" with payer_responsibility="resident"'
                )
            )
            
            # Show what exists
            base_query = Expense.objects.filter(
                building__name__icontains=building_name
            ).filter(
                Q(category='maintenance_project') | Q(category='project')
            )
            
            if all_related:
                all_matching = base_query.filter(
                    Q(title__icontains=title_pattern) | Q(notes__icontains=notes_pattern)
                )
            else:
                all_matching = base_query.filter(
                    title__icontains=title_pattern
                )
            
            if all_matching.exists():
                self.stdout.write(f'\n📋 Found {all_matching.count()} matching expenses with different payer_responsibility:')
                for exp in all_matching:
                    self.stdout.write(
                        f"  - ID: {exp.id}, Title: {exp.title}, "
                        f"Amount: €{exp.amount}, Date: {exp.date}, "
                        f"Payer: {exp.payer_responsibility}"
                    )
            return
        
        self.stdout.write(f"\n🔍 Found {count} expense(s) that need payer_responsibility update:")
        self.stdout.write(f"   Building: {building_name}")
        self.stdout.write(f"   Title pattern: {title_pattern}\n")
        
        for expense in wrong_payer_expenses:
            self.stdout.write(
                f"  - ID: {expense.id}"
                f"\n    Building: {expense.building.name}"
                f"\n    Title: {expense.title}"
                f"\n    Amount: €{expense.amount}"
                f"\n    Date: {expense.date}"
                f"\n    Category: {expense.category}"
                f"\n    Current payer: {expense.payer_responsibility}"
                f"\n    Notes: {expense.notes[:100] if expense.notes else 'N/A'}\n"
            )
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN - No changes made'))
            self.stdout.write(f"Would update {count} expense(s) to payer_responsibility='owner'")
            return
        
        # Update all wrong payer expenses
        updated_count = wrong_payer_expenses.update(payer_responsibility='owner')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully updated {updated_count} expense(s) to payer_responsibility="owner"'
            )
        )
        
        # Show summary
        self.stdout.write('\n📊 Summary:')
        base_query = Expense.objects.filter(
            building__name__icontains=building_name
        ).filter(
            Q(category='maintenance_project') | Q(category='project')
        )
        
        if all_related:
            all_project_expenses = base_query.filter(
                Q(title__icontains=title_pattern) | Q(notes__icontains=notes_pattern)
            )
        else:
            all_project_expenses = base_query.filter(
                title__icontains=title_pattern
            )
        
        self.stdout.write(f'  - Total matching expenses: {all_project_expenses.count()}')
        self.stdout.write(
            f'  - With payer=owner: {all_project_expenses.filter(payer_responsibility="owner").count()}'
        )
        self.stdout.write(
            f'  - With payer=resident: {all_project_expenses.filter(payer_responsibility="resident").count()}'
        )
        self.stdout.write(
            f'  - With payer=shared: {all_project_expenses.filter(payer_responsibility="shared").count()}'
        )

