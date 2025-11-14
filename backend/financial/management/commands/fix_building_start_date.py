"""
Django management command για τον ορισμό financial_system_start_date
για το demo κτίριο "Αλκμάνος" αν δεν υπάρχει ήδη.
"""
from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense
from datetime import date
from django.utils import timezone


class Command(BaseCommand):
    help = 'Ορίζει το financial_system_start_date για το κτίριο Αλκμάνος αν δεν υπάρχει ήδη'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Το schema name του tenant (default: demo)',
        )
        parser.add_argument(
            '--building-name',
            type=str,
            default='Αλκμάνος',
            help='Το όνομα του κτιρίου (default: Αλκμάνος)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Επιβολή αλλαγής ακόμα και αν υπάρχει ήδη ημερομηνία',
        )

    def handle(self, *args, **options):
        schema_name = options['schema']
        building_name = options['building_name']
        force = options['force']

        with schema_context(schema_name):
            self.stdout.write("\n" + "="*80)
            self.stdout.write(self.style.SUCCESS("ΕΛΕΓΧΟΣ ΚΑΙ ΟΡΙΣΜΟΣ FINANCIAL_SYSTEM_START_DATE"))
            self.stdout.write("="*80 + "\n")

            # Βρίσκουμε το building
            building = Building.objects.filter(name__icontains=building_name).first()
            if not building:
                self.stdout.write(self.style.ERROR(f"❌ Δεν βρέθηκε κτίριο με όνομα '{building_name}' στο schema '{schema_name}'"))
                return

            self.stdout.write(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            self.stdout.write(f"   Τρέχον financial_system_start_date: {building.financial_system_start_date}\n")

            # Ελέγχουμε αν υπάρχει ήδη (εκτός αν force=True)
            if building.financial_system_start_date and not force:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Το financial_system_start_date είναι ήδη ορισμένο: {building.financial_system_start_date}"
                    )
                )
                self.stdout.write("   Δεν χρειάζεται αλλαγή.\n")
                return

            if building.financial_system_start_date and force:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  Force mode: Θα αντικαταστήσουμε το υπάρχον financial_system_start_date: {building.financial_system_start_date}"
                    )
                )
            else:
                self.stdout.write(self.style.WARNING("⚠️  Το financial_system_start_date δεν είναι ορισμένο. Προχωράμε στον ορισμό...\n"))

            # Βρίσκουμε την παλαιότερη δαπάνη
            oldest_expense = Expense.objects.filter(
                building=building
            ).order_by('date').first()

            if oldest_expense:
                # Ορίζουμε την 1η του μήνα της παλαιότερης δαπάνης
                expense_date = oldest_expense.date
                start_date = date(expense_date.year, expense_date.month, 1)
                self.stdout.write(f"   📅 Παλαιότερη δαπάνη: {oldest_expense.title}")
                self.stdout.write(f"   📅 Ημερομηνία δαπάνης: {expense_date}")
                self.stdout.write(f"   📅 Ορισμός start_date: {start_date} (1η του μήνα)")
            else:
                # Default: 1η του τρέχοντος μήνα (όπως στο Building.save())
                today = timezone.now().date()
                start_date = today.replace(day=1)
                self.stdout.write(self.style.WARNING("   ⚠️  Δεν βρέθηκαν δαπάνες"))
                self.stdout.write(f"   📅 Χρήση default: {start_date} (1η του τρέχοντος μήνα)")

            self.stdout.write(f"\n   ✅ Ορισμός financial_system_start_date: {start_date}")

            building.financial_system_start_date = start_date
            building.save(update_fields=['financial_system_start_date'])

            self.stdout.write(f"\n   ✅ Ενημερωμένο building:")
            self.stdout.write(f"      financial_system_start_date: {building.financial_system_start_date}")

            self.stdout.write("\n" + "="*80)
            self.stdout.write(self.style.SUCCESS("ΟΛΟΚΛΗΡΩΣΗ"))
            self.stdout.write("="*80 + "\n")

