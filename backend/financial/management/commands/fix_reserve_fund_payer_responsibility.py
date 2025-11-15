"""
Management command για διόρθωση payer_responsibility σε δαπάνες αποθεματικού.

Αυτό το command ενημερώνει όλες τις δαπάνες με category='reserve_fund' 
ώστε να έχουν payer_responsibility='owner' (αν δεν το έχουν ήδη).
"""

from django.core.management.base import BaseCommand
from financial.models import Expense


class Command(BaseCommand):
    help = 'Διορθώνει payer_responsibility σε δαπάνες αποθεματικού'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Εμφάνιση αλλαγών χωρίς εφαρμογή',
        )
        parser.add_argument(
            '--building-id',
            type=int,
            help='ID κτιρίου για φιλτράρισμα (προαιρετικό)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        building_id = options.get('building_id')

        # Φιλτράρισμα δαπανών αποθεματικού
        queryset = Expense.objects.filter(category='reserve_fund')
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)

        # Βρες δαπάνες που χρειάζονται διόρθωση
        expenses_to_fix = queryset.filter(
            payer_responsibility__in=['resident', None, '']
        ).exclude(payer_responsibility='owner')

        total_count = expenses_to_fix.count()

        if total_count == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ Όλες οι δαπάνες αποθεματικού έχουν ήδη payer_responsibility="owner"')
            )
            return

        self.stdout.write(f'📊 Βρέθηκαν {total_count} δαπάνες αποθεματικού που χρειάζονται διόρθωση')

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 DRY RUN - Δεν θα γίνουν αλλαγές'))
            for expense in expenses_to_fix[:10]:  # Εμφάνιση πρώτων 10
                self.stdout.write(
                    f'  - {expense.building.name} | {expense.title} | '
                    f'Ημερομηνία: {expense.date} | Τρέχον: {expense.payer_responsibility or "None"} → owner'
                )
            if total_count > 10:
                self.stdout.write(f'  ... και {total_count - 10} ακόμα')
            return

        # Ενημέρωση
        updated_count = expenses_to_fix.update(payer_responsibility='owner')

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Ενημερώθηκαν {updated_count} δαπάνες αποθεματικού με payer_responsibility="owner"'
            )
        )

        # Εμφάνιση στατιστικών ανά κτίριο
        if building_id:
            building = expenses_to_fix.first().building if expenses_to_fix.exists() else None
            if building:
                self.stdout.write(f'📊 Κτίριο: {building.name} ({building.id})')
        else:
            # Ομαδοποίηση ανά κτίριο
            from django.db.models import Count
            by_building = (
                expenses_to_fix.values('building__name', 'building__id')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
            if by_building:
                self.stdout.write('\n📊 Ανά κτίριο:')
                for item in by_building[:10]:
                    self.stdout.write(
                        f'  - {item["building__name"]} ({item["building__id"]}): {item["count"]} δαπάνες'
                    )

