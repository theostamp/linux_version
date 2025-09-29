from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from maintenance.models import PaymentSchedule, ScheduledMaintenance


class Command(BaseCommand):
    help = 'Συγχρονίζει τις ημερομηνίες πληρωμών με τις ημερομηνίες έναρξης των έργων'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφανίζει τι θα αλλάξει χωρίς να κάνει αλλαγές',
        )
        parser.add_argument(
            '--maintenance-id',
            type=int,
            help='Συγχρονίζει μόνο το συγκεκριμένο έργο',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        maintenance_id = options.get('maintenance_id')
        
        with schema_context('demo'):
            if maintenance_id:
                # Sync specific maintenance
                try:
                    maintenance = ScheduledMaintenance.objects.get(id=maintenance_id)
                    self.sync_maintenance(maintenance, dry_run)
                except ScheduledMaintenance.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f'Έργο με ID {maintenance_id} δεν βρέθηκε')
                    )
            else:
                # Sync all maintenance with payment schedules
                maintenance_with_payments = ScheduledMaintenance.objects.filter(
                    payment_schedule__isnull=False
                ).select_related('payment_schedule')
                
                self.stdout.write(f'Βρέθηκαν {maintenance_with_payments.count()} έργα με προγράμματα πληρωμών')
                
                for maintenance in maintenance_with_payments:
                    self.sync_maintenance(maintenance, dry_run)
    
    def sync_maintenance(self, maintenance, dry_run=False):
        """Συγχρονίζει ένα συγκεκριμένο έργο"""
        payment_schedule = maintenance.payment_schedule
        
        if not payment_schedule:
            return
        
        # Check if dates are already in sync
        if payment_schedule.start_date == maintenance.scheduled_date:
            self.stdout.write(
                f'✅ Έργο "{maintenance.title}" - ήδη συγχρονισμένο'
            )
            return
        
        self.stdout.write(f'\\n🔧 Έργο: {maintenance.title}')
        self.stdout.write(f'   Ημερομηνία έργου: {maintenance.scheduled_date}')
        self.stdout.write(f'   Ημερομηνία πληρωμών: {payment_schedule.start_date}')
        
        if dry_run:
            self.stdout.write(f'   [DRY RUN] Θα αλλάξει σε: {maintenance.scheduled_date}')
            
            # Show what installments would change
            installments = payment_schedule.installments.all().order_by('installment_number')
            for installment in installments:
                self.stdout.write(f'   [DRY RUN] Δόση {installment.installment_number}: {installment.due_date} → [υπολογίζεται]')
        else:
            # Actually sync the dates
            try:
                success = payment_schedule.sync_with_maintenance_date()
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(f'   ✅ Συγχρονίστηκε επιτυχώς!')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'   ⚠️ Δεν χρειαζόταν συγχρονισμός')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'   ❌ Σφάλμα: {str(e)}')
                )

