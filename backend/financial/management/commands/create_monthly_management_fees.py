"""
Django management command για αυτόματη καταχώρηση μηνιαίων διαχειριστικών εξόδων
Τρέχει κάθε 1η του μήνα και δημιουργεί αυτόματα τις δαπάνες διαχείρισης
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django_tenants.utils import schema_context, get_tenant_model
from datetime import datetime, date
from decimal import Decimal
from buildings.models import Building
from financial.models import Expense
from apartments.models import Apartment


class Command(BaseCommand):
    help = 'Δημιουργεί αυτόματα τις μηνιαίες δαπάνες διαχείρισης για όλα τα κτίρια'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            help='Μήνας σε μορφή YYYY-MM (προαιρετικό, default: τρέχων μήνας)',
        )
        parser.add_argument(
            '--building_id',
            type=int,
            help='ID συγκεκριμένου κτιρίου (προαιρετικό, default: όλα τα κτίρια)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εκτέλεση χωρίς δημιουργία εγγραφών (για δοκιμή)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Δημιουργία ακόμη και αν υπάρχει ήδη για τον μήνα',
        )

    def handle(self, *args, **options):
        # Προσδιορισμός μήνα
        if options['month']:
            try:
                year, month = map(int, options['month'].split('-'))
                target_date = date(year, month, 1)
            except ValueError:
                self.stdout.write(self.style.ERROR('Λάθος μορφή μήνα. Χρησιμοποιήστε YYYY-MM'))
                return
        else:
            # Τρέχων μήνας
            now = datetime.now()
            target_date = date(now.year, now.month, 1)
        
        month_str = target_date.strftime('%Y-%m')
        self.stdout.write(f'📅 Επεξεργασία για μήνα: {month_str}')
        
        # Λήψη όλων των tenants
        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.exclude(schema_name='public')
        
        total_created = 0
        total_skipped = 0
        total_errors = 0
        
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
                    
                    # Έλεγχος αν έχει οριστεί management fee
                    if not building.management_fee_per_apartment or building.management_fee_per_apartment == 0:
                        self.stdout.write(self.style.WARNING(f'    ⚠️  Δεν έχει οριστεί αμοιβή διαχείρισης'))
                        total_skipped += 1
                        continue
                    
                    # Έλεγχος αν υπάρχει ήδη για τον μήνα
                    existing = Expense.objects.filter(
                        building=building,
                        expense_type='management_fee',
                        date__year=target_date.year,
                        date__month=target_date.month
                    )
                    
                    if existing.exists() and not options['force']:
                        self.stdout.write(self.style.WARNING(f'    ⚠️  Υπάρχει ήδη δαπάνη διαχείρισης για {month_str}'))
                        total_skipped += 1
                        continue
                    
                    # Υπολογισμός συνολικού ποσού
                    apartments_count = Apartment.objects.filter(building=building).count()
                    if apartments_count == 0:
                        self.stdout.write(self.style.WARNING(f'    ⚠️  Δεν βρέθηκαν διαμερίσματα'))
                        total_skipped += 1
                        continue
                    
                    total_amount = building.management_fee_per_apartment * apartments_count
                    
                    # Δημιουργία δαπάνης (αν δεν είναι dry-run)
                    if options['dry_run']:
                        self.stdout.write(self.style.SUCCESS(
                            f'    ✅ [DRY-RUN] Θα δημιουργούσε δαπάνη: {total_amount}€ '
                            f'({apartments_count} x {building.management_fee_per_apartment}€)'
                        ))
                    else:
                        try:
                            expense = Expense.objects.create(
                                building=building,
                                title=f'Διαχειριστικά Έξοδα {target_date.strftime("%B %Y")}',
                                amount=total_amount,
                                date=target_date,
                                category='management_fees',
                                expense_type='management_fee',  # Διακριτός τύπος για εύκολη αναγνώριση
                                distribution_type='by_participation_mills',  # Κατανομή βάσει χιλιοστών
                                notes=f'Αυτόματη καταχώρηση διαχειριστικών εξόδων για {month_str}\n'
                                      f'Ποσό ανά διαμέρισμα: {building.management_fee_per_apartment}€\n'
                                      f'Αριθμός διαμερισμάτων: {apartments_count}\n'
                                      f'Συνολικό ποσό: {total_amount}€'
                            )
                            
                            self.stdout.write(self.style.SUCCESS(
                                f'    ✅ Δημιουργήθηκε δαπάνη: {total_amount}€ '
                                f'({apartments_count} x {building.management_fee_per_apartment}€)'
                            ))
                            total_created += 1
                            
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'    ❌ Σφάλμα: {str(e)}'))
                            total_errors += 1
        
        # Σύνοψη
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'✅ Δημιουργήθηκαν: {total_created} δαπάνες'))
        self.stdout.write(self.style.WARNING(f'⚠️  Παραλείφθηκαν: {total_skipped} δαπάνες'))
        if total_errors > 0:
            self.stdout.write(self.style.ERROR(f'❌ Σφάλματα: {total_errors}'))
        
        if options['dry_run']:
            self.stdout.write('\n' + self.style.NOTICE('ℹ️  Αυτό ήταν dry-run. Δεν έγιναν αλλαγές στη βάση.'))
