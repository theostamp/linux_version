"""
Django management command για αυτόματη δημιουργία επαναλαμβανόμενων δαπανών.

Χρησιμοποιεί το RecurringExpenseConfig model για να δημιουργήσει δαπάνες διαχείρισης
και αποθεματικού για κάθε μήνα, σεβόμενο το ιστορικό αλλαγών στα ποσά.

Παραδείγματα:
    # Δημιουργία για όλα τα κτίρια, όλους τους μήνες από financial_system_start_date
    python manage.py generate_recurring_expenses

    # Δημιουργία για συγκεκριμένο κτίριο
    python manage.py generate_recurring_expenses --building_id 1

    # Δημιουργία για συγκεκριμένο εύρος μηνών
    python manage.py generate_recurring_expenses --from 2025-01 --to 2026-12

    # Dry run (χωρίς δημιουργία)
    python manage.py generate_recurring_expenses --dry-run
"""

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context, get_tenant_model
from datetime import date, timedelta
from decimal import Decimal
import calendar

from buildings.models import Building
from financial.models import Expense, RecurringExpenseConfig
from apartments.models import Apartment


class Command(BaseCommand):
    help = 'Δημιουργεί αυτόματα επαναλαμβανόμενες δαπάνες (διαχείριση, αποθεματικό) βάσει ρυθμίσεων'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building_id',
            type=int,
            help='ID συγκεκριμένου κτιρίου (προαιρετικό)',
        )
        parser.add_argument(
            '--from',
            type=str,
            dest='from_month',
            help='Μήνας έναρξης σε μορφή YYYY-MM (default: financial_system_start_date)',
        )
        parser.add_argument(
            '--to',
            type=str,
            dest='to_month',
            help='Μήνας λήξης σε μορφή YYYY-MM (default: τρέχων μήνας)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εκτέλεση χωρίς δημιουργία εγγραφών (για δοκιμή)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Δημιουργία ακόμη και αν υπάρχει ήδη η δαπάνη',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN MODE - Δεν θα γίνει καμία δημιουργία\n'))

        # Process all tenants (excluding public schema)
        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.exclude(schema_name='public')

        for tenant in tenants:
            with schema_context(tenant.schema_name):
                self.stdout.write(f"\n{'='*80}")
                self.stdout.write(f"🏢 Tenant: {tenant.schema_name}")
                self.stdout.write(f"{'='*80}\n")

                # Get buildings to process
                if options['building_id']:
                    buildings = Building.objects.filter(id=options['building_id'])
                else:
                    buildings = Building.objects.all()

                if not buildings.exists():
                    self.stdout.write(self.style.WARNING('   ⚠️  Δεν βρέθηκαν κτίρια'))
                    continue

                for building in buildings:
                    self._process_building(building, options, dry_run, force)

        self.stdout.write(self.style.SUCCESS('\n✅ Ολοκληρώθηκε!'))

    def _process_building(self, building: Building, options: dict, dry_run: bool, force: bool):
        """Επεξεργασία ενός κτιρίου"""
        self.stdout.write(f"  🏠 Κτίριο: {building.name} (ID: {building.id})")

        if not building.financial_system_start_date:
            self.stdout.write(self.style.WARNING(
                f"     ⚠️  Παράλειψη: Δεν έχει οριστεί financial_system_start_date"
            ))
            return

        # Προσδιορισμός εύρους μηνών
        if options['from_month']:
            try:
                year, month = map(int, options['from_month'].split('-'))
                start_date = date(year, month, 1)
            except ValueError:
                self.stdout.write(self.style.ERROR('     ❌ Λάθος μορφή --from (χρήση: YYYY-MM)'))
                return
        else:
            start_date = building.financial_system_start_date

        if options['to_month']:
            try:
                year, month = map(int, options['to_month'].split('-'))
                end_date = date(year, month, 1)
            except ValueError:
                self.stdout.write(self.style.ERROR('     ❌ Λάθος μορφή --to (χρήση: YYYY-MM)'))
                return
        else:
            # Default: τρέχων μήνας
            today = date.today()
            end_date = date(today.year, today.month, 1)

        self.stdout.write(f"     📅 Περίοδος: {start_date.strftime('%Y-%m')} έως {end_date.strftime('%Y-%m')}")

        # Έλεγχος ρυθμίσεων
        configs = RecurringExpenseConfig.objects.filter(
            building=building,
            is_active=True
        )

        if not configs.exists():
            self.stdout.write(self.style.WARNING(
                f"     ⚠️  Δεν βρέθηκαν ενεργές ρυθμίσεις επαναλαμβανόμενων δαπανών"
            ))
            return

        self.stdout.write(f"     ✅ Βρέθηκαν {configs.count()} ενεργές ρυθμίσεις\n")

        # Επεξεργασία κάθε μήνα
        current_date = start_date
        created_count = 0
        skipped_count = 0

        while current_date <= end_date:
            month_created, month_skipped = self._process_month(
                building, current_date, dry_run, force
            )
            created_count += month_created
            skipped_count += month_skipped

            # Επόμενος μήνας
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

        self.stdout.write(f"\n     {'='*60}")
        self.stdout.write(self.style.SUCCESS(f"     ✅ Δημιουργήθηκαν: {created_count} δαπάνες"))
        self.stdout.write(self.style.WARNING(f"     ⚠️  Παραλείφθηκαν: {skipped_count} δαπάνες"))
        self.stdout.write(f"     {'='*60}\n")

    def _process_month(self, building: Building, month_date: date, dry_run: bool, force: bool) -> tuple:
        """
        Επεξεργασία ενός μήνα - δημιουργία δαπανών διαχείρισης και αποθεματικού.

        Returns:
            (created_count, skipped_count)
        """
        created = 0
        skipped = 0

        # Ημερομηνία δαπάνης = τελευταία του μήνα (ΚΡΙΣΙΜΟ για balance transfers!)
        last_day = calendar.monthrange(month_date.year, month_date.month)[1]
        expense_date = date(month_date.year, month_date.month, last_day)

        self.stdout.write(f"     📆 {month_date.strftime('%B %Y')} (date: {expense_date})")

        # Δαπάνες διαχείρισης
        mgmt_created, mgmt_skipped = self._create_expense_if_needed(
            building=building,
            expense_type='management_fee',
            month_date=month_date,
            expense_date=expense_date,
            dry_run=dry_run,
            force=force
        )
        created += mgmt_created
        skipped += mgmt_skipped

        # Αποθεματικό
        reserve_created, reserve_skipped = self._create_expense_if_needed(
            building=building,
            expense_type='reserve_fund',
            month_date=month_date,
            expense_date=expense_date,
            dry_run=dry_run,
            force=force
        )
        created += reserve_created
        skipped += reserve_skipped

        return (created, skipped)

    def _create_expense_if_needed(
        self,
        building: Building,
        expense_type: str,
        month_date: date,
        expense_date: date,
        dry_run: bool,
        force: bool
    ) -> tuple:
        """
        Δημιουργεί δαπάνη αν χρειάζεται.

        Returns:
            (created_count, skipped_count)
        """
        # Βρες την ενεργή ρύθμιση για αυτόν τον μήνα
        config = RecurringExpenseConfig.get_active_config(
            building_id=building.id,
            expense_type=expense_type,
            target_date=expense_date
        )

        if not config:
            # Δεν υπάρχει ρύθμιση για αυτόν τον τύπο δαπάνης
            return (0, 0)

        # Έλεγχος αν υπάρχει ήδη
        existing = Expense.objects.filter(
            building=building,
            expense_type=expense_type,
            date=expense_date
        ).exists()

        if existing and not force:
            self.stdout.write(
                f"        ⏭️  {config.get_expense_type_display()}: Υπάρχει ήδη"
            )
            return (0, 1)

        # Υπολογισμός ποσού
        total_amount = config.calculate_total_amount()

        if total_amount <= 0:
            self.stdout.write(self.style.WARNING(
                f"        ⚠️  {config.get_expense_type_display()}: Μηδενικό ποσό"
            ))
            return (0, 1)

        # Τίτλος δαπάνης
        expense_title = self._get_expense_title(expense_type, month_date)

        # Category mapping
        category_map = {
            'management_fee': 'management_fees',
            'reserve_fund': 'reserve_fund',
        }

        if dry_run:
            self.stdout.write(
                f"        🔍 [DRY RUN] {config.get_expense_type_display()}: "
                f"€{total_amount} ({config.get_amount_display()})"
            )
            return (1, 0)

        # Δημιουργία δαπάνης
        try:
            expense = Expense.objects.create(
                building=building,
                title=expense_title,
                amount=total_amount,
                date=expense_date,
                due_date=expense_date,
                category=category_map.get(expense_type, 'miscellaneous'),
                expense_type=expense_type,
                distribution_type=config.distribution_type,
                notes=f"Αυτόματη δημιουργία από ρύθμιση: {config.get_amount_display()}"
            )

            self.stdout.write(self.style.SUCCESS(
                f"        ✅ {config.get_expense_type_display()}: "
                f"€{total_amount} ({config.get_amount_display()})"
            ))

            return (1, 0)

        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"        ❌ Σφάλμα δημιουργίας: {str(e)}"
            ))
            return (0, 1)

    def _get_expense_title(self, expense_type: str, month_date: date) -> str:
        """Δημιουργεί τον τίτλο της δαπάνης"""
        month_name_en = month_date.strftime('%B %Y')

        title_map = {
            'management_fee': f'Διαχειριστικά Έξοδα {month_name_en}',
            'reserve_fund': f'Αποθεματικό Ταμείο {month_name_en}',
        }

        return title_map.get(expense_type, f'Επαναλαμβανόμενη Δαπάνη {month_name_en}')
