"""
Management command to sync payment installments with expenses.
Creates expenses for pending payment installments and updates them as needed.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
from django_tenants.utils import schema_context

from maintenance.models import PaymentInstallment, PaymentReceipt
from financial.models import Expense


class Command(BaseCommand):
    help = 'Sync payment installments with financial expenses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            help='Only process specific building ID',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--create-only',
            action='store_true',
            help='Only create new expenses, do not update existing ones',
        )

    def handle(self, *args, **options):
        building_id = options.get('building_id')
        dry_run = options.get('dry_run', False)
        create_only = options.get('create_only', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Run within tenant context
        with schema_context('demo'):
            # Get active payment installments that are due or overdue
            installments = PaymentInstallment.objects.select_related(
                'payment_schedule__scheduled_maintenance__building',
                'payment_schedule__scheduled_maintenance__contractor'
            ).filter(
                status='pending',
                due_date__lte=timezone.now().date() + timedelta(days=120)  # Due within 120 days
            )

            if building_id:
                installments = installments.filter(
                    payment_schedule__scheduled_maintenance__building_id=building_id
                )

            self.stdout.write(f'Found {installments.count()} active payment installments')

            created_count = 0
            updated_count = 0
            error_count = 0

            for installment in installments:
                try:
                    with transaction.atomic():
                        result = self._process_installment(installment, dry_run, create_only)
                        if result == 'created':
                            created_count += 1
                        elif result == 'updated':
                            updated_count += 1
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing installment {installment.id}: {e}')
                    )

            # Summary
            self.stdout.write('')
            if dry_run:
                self.stdout.write(self.style.SUCCESS(f'DRY RUN COMPLETED:'))
            else:
                self.stdout.write(self.style.SUCCESS(f'SYNC COMPLETED:'))
            
            self.stdout.write(f'  Created: {created_count} expenses')
            self.stdout.write(f'  Updated: {updated_count} expenses') 
            if error_count > 0:
                self.stdout.write(self.style.ERROR(f'  Errors: {error_count}'))

    def _process_installment(self, installment, dry_run=False, create_only=False):
        """Process a single payment installment"""
        maintenance = installment.payment_schedule.scheduled_maintenance
        building = maintenance.building

        # Check if there's already a PaymentReceipt for this installment
        receipt = getattr(installment, 'receipt', None)
        
        if receipt and receipt.linked_expense:
            if create_only:
                return 'skipped'
            
            # Update existing expense if needed
            expense = receipt.linked_expense
            if expense.amount != installment.amount:
                self.stdout.write(
                    f'Updating expense {expense.id} amount: {expense.amount} -> {installment.amount}'
                )
                if not dry_run:
                    expense.amount = installment.amount
                    expense.save(update_fields=['amount'])
                return 'updated'
            return 'no_change'

        # Create new PaymentReceipt and linked Expense
        expense_category = self._get_expense_category(maintenance)
        expense_title = f"{maintenance.title}"
        if installment.installment_type == 'advance':
            expense_title += f" (Προκαταβολή)"
        elif installment.installment_type == 'installment':
            expense_title += f" (Δόση {installment.installment_number})"

        self.stdout.write(
            f'Creating expense for installment {installment.id}: '
            f'{expense_title} - €{installment.amount}'
        )

        if dry_run:
            return 'created'

        # Create the expense
        expense = Expense.objects.create(
            building=building,
            title=expense_title,
            amount=installment.amount,
            date=installment.due_date,
            category=expense_category,
            distribution_type='by_participation_mills',
            expense_type='regular',
            supplier=maintenance.contractor.supplier if maintenance.contractor else None,
            notes=f"Αυτόματη δημιουργία από πρόγραμμα πληρωμών: {installment.description}"
        )

        # Create PaymentReceipt to link the installment with the expense
        PaymentReceipt.objects.create(
            scheduled_maintenance=maintenance,
            contractor=maintenance.contractor,
            installment=installment,
            receipt_type=installment.installment_type,
            receipt_number=f"PAY-{installment.id}-{timezone.now().strftime('%Y%m%d')}",
            amount=installment.amount,
            payment_date=installment.due_date,
            description=installment.description,
            status='issued',
            linked_expense=expense,
            notes=f"Αυτόματη σύνδεση με δαπάνη {expense.id}"
        )

        self.stdout.write(
            self.style.SUCCESS(f'Created expense {expense.id} and linked receipt')
        )
        return 'created'

    def _get_expense_category(self, maintenance):
        """Determine expense category from maintenance title/contractor"""
        title_lower = maintenance.title.lower()
        
        # Category mapping based on keywords in title
        category_keywords = {
            'ανελκυστήρα': 'elevator_maintenance',
            'ανελκυστήρα': 'elevator_maintenance', 
            'καυστήρα': 'heating_maintenance',
            'θέρμανση': 'heating_maintenance',
            'ηλεκτρικ': 'electrical_maintenance',
            'φωτισμός': 'lighting_common',
            'καθαρισμός': 'cleaning',
            'κήπου': 'garden_maintenance',
            'στέγη': 'roof_maintenance',
            'δεξαμενή': 'water_tank_cleaning',
            'πυροσβεστήρ': 'fire_extinguishers',
            'ενδοεπικοινωνία': 'intercom_system',
            'θυροτηλέφων': 'intercom_system',
        }

        for keyword, category in category_keywords.items():
            if keyword in title_lower:
                return category

        # Default category
        return 'building_maintenance'