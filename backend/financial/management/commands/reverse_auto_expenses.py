"""
Django management command για ανάκληση αυτόματα δημιουργημένων δαπανών
Επιτρέπει την εύκολη ανάκληση διαχειριστικών εξόδων και άλλων αυτόματων δαπανών
"""

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context, get_tenant_model
from datetime import date
from financial.models import Expense
from buildings.models import Building


class Command(BaseCommand):
    help = 'Ανακαλεί αυτόματα δημιουργημένες δαπάνες (διαχειριστικά έξοδα κλπ)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            help='Μήνας σε μορφή YYYY-MM (υποχρεωτικό για ασφάλεια)',
            required=True
        )
        parser.add_argument(
            '--building_id',
            type=int,
            help='ID συγκεκριμένου κτιρίου (προαιρετικό, default: όλα τα κτίρια)',
        )
        parser.add_argument(
            '--expense_type',
            type=str,
            choices=['management_fee', 'reserve_fund', 'auto_generated', 'all'],
            default='management_fee',
            help='Τύπος δαπάνης προς ανάκληση (default: management_fee)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εκτέλεση χωρίς διαγραφή εγγραφών (για δοκιμή)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Διαγραφή χωρίς επιβεβαίωση',
        )

    def handle(self, *args, **options):
        # Προσδιορισμός μήνα
        try:
            year, month = map(int, options['month'].split('-'))
            target_date = date(year, month, 1)
        except ValueError:
            self.stdout.write(self.style.ERROR('Λάθος μορφή μήνα. Χρησιμοποιήστε YYYY-MM'))
            return
        
        month_str = target_date.strftime('%Y-%m')
        self.stdout.write(f'📅 Αναζήτηση δαπανών για μήνα: {month_str}')
        
        # Λήψη όλων των tenants
        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.exclude(schema_name='public')
        
        total_found = 0
        total_deleted = 0
        expenses_to_delete = []
        
        for tenant in tenants:
            self.stdout.write(f'\n🏢 Tenant: {tenant.schema_name}')
            
            with schema_context(tenant.schema_name):
                # Προσδιορισμός κτιρίων
                if options['building_id']:
                    buildings = Building.objects.filter(id=options['building_id'])
                    if not buildings.exists():
                        self.stdout.write(self.style.WARNING(f'  ⚠️  Δεν βρέθηκε κτίριο με ID {options["building_id"]}'))
                        continue
                else:
                    buildings = Building.objects.all()
                
                for building in buildings:
                    self.stdout.write(f'  🏠 Κτίριο: {building.name} (ID: {building.id})')
                    
                    # Δημιουργία query για δαπάνες
                    query = Expense.objects.filter(
                        building=building,
                        date__year=target_date.year,
                        date__month=target_date.month
                    )
                    
                    # Φιλτράρισμα βάσει τύπου
                    if options['expense_type'] == 'all':
                        query = query.filter(expense_type__in=['management_fee', 'reserve_fund', 'auto_generated'])
                    else:
                        query = query.filter(expense_type=options['expense_type'])
                    
                    expenses = query.all()
                    
                    if not expenses:
                        self.stdout.write(f'    ℹ️  Δεν βρέθηκαν δαπάνες τύπου {options["expense_type"]}')
                        continue
                    
                    for expense in expenses:
                        self.stdout.write(f'    📄 {expense.title}: {expense.amount}€ (ID: {expense.id})')
                        expenses_to_delete.append((tenant.schema_name, expense))
                        total_found += 1
        
        if total_found == 0:
            self.stdout.write(self.style.WARNING('\n⚠️  Δεν βρέθηκαν δαπάνες προς ανάκληση'))
            return
        
        # Επιβεβαίωση διαγραφής
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.WARNING(f'⚠️  Βρέθηκαν {total_found} δαπάνες προς ανάκληση'))
        
        if options['dry_run']:
            self.stdout.write(self.style.NOTICE('ℹ️  Αυτό είναι dry-run. Δεν θα γίνουν διαγραφές.'))
            return
        
        if not options['force']:
            confirm = input('\nΕίστε σίγουροι ότι θέλετε να διαγράψετε αυτές τις δαπάνες; (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Ακύρωση διαγραφής'))
                return
        
        # Διαγραφή δαπανών
        for schema_name, expense in expenses_to_delete:
            with schema_context(schema_name):
                try:
                    expense_id = expense.id
                    expense_title = expense.title
                    expense_amount = expense.amount
                    expense.delete()
                    self.stdout.write(self.style.SUCCESS(
                        f'    ✅ Διαγράφηκε: {expense_title} - {expense_amount}€ (ID: {expense_id})'
                    ))
                    total_deleted += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'    ❌ Σφάλμα διαγραφής {expense.title}: {str(e)}'
                    ))
        
        # Σύνοψη
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'✅ Διαγράφηκαν: {total_deleted}/{total_found} δαπάνες'))
