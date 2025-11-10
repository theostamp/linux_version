"""
Management command για backfill management fees
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from decimal import Decimal


class Command(BaseCommand):
    help = 'Δημιουργεί management fees για προηγούμενους μήνες (backfill)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--building-id',
            type=int,
            required=True,
            help='Building ID'
        )
        parser.add_argument(
            '--start-month',
            type=str,
            required=True,
            help='Start month in YYYY-MM format'
        )
        parser.add_argument(
            '--end-month',
            type=str,
            default=None,
            help='End month in YYYY-MM format (default: current month)'
        )

    def handle(self, *args, **options):
        building_id = options['building_id']
        start_month = options['start_month']
        end_month = options['end_month']

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Building with ID {building_id} not found'))
            return

        if not building.management_fee_per_apartment or building.management_fee_per_apartment <= 0:
            self.stdout.write(self.style.ERROR(f'❌ Building {building.name} has no management_fee_per_apartment set'))
            return

        # Parse dates
        try:
            start_year, start_mon = map(int, start_month.split('-'))
            start_date = date(start_year, start_mon, 1)
        except (ValueError, AttributeError):
            self.stdout.write(self.style.ERROR(f'❌ Invalid start_month format: {start_month}'))
            return

        if end_month:
            try:
                end_year, end_mon = map(int, end_month.split('-'))
                end_date = date(end_year, end_mon, 1)
            except (ValueError, AttributeError):
                self.stdout.write(self.style.ERROR(f'❌ Invalid end_month format: {end_month}'))
                return
        else:
            today = date.today()
            end_date = date(today.year, today.month, 1)

        # Check financial_system_start_date
        if building.financial_system_start_date and start_date < building.financial_system_start_date:
            start_date = building.financial_system_start_date
            self.stdout.write(self.style.WARNING(
                f'📅 Adjusted start_date to financial_system_start_date: {start_date}'
            ))

        self.stdout.write(f'🔄 Starting management fees backfill for {building.name} from {start_date} to {end_date}')

        apartments_count = Apartment.objects.filter(building=building).count()
        total_amount = building.management_fee_per_apartment * apartments_count

        created_count = 0
        skipped_count = 0
        current_date = start_date

        while current_date <= end_date:
            # Check if already exists
            existing = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=current_date.year,
                date__month=current_date.month
            ).exists()

            if existing:
                self.stdout.write(f"⏭️ Management fees already exist for {current_date.strftime('%B %Y')}")
                skipped_count += 1
            else:
                # Last day of month
                if current_date.month == 12:
                    last_day = date(current_date.year, 12, 31)
                else:
                    from calendar import monthrange
                    _, last_day_num = monthrange(current_date.year, current_date.month)
                    last_day = date(current_date.year, current_date.month, last_day_num)

                Expense.objects.create(
                    building=building,
                    amount=total_amount,
                    date=last_day,
                    category='management_fees',
                    description=f'Διαχειριστικά Έξοδα {current_date.strftime("%B %Y")}',
                    distribution_type='equal',
                    payer_responsibility='resident',
                    approved=True
                )

                self.stdout.write(self.style.SUCCESS(
                    f"✅ Created management fees for {current_date.strftime('%B %Y')}: €{total_amount}"
                ))
                created_count += 1

            # Next month
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

        self.stdout.write(self.style.SUCCESS(
            f'✅ Backfill completed: {created_count} created, {skipped_count} skipped'
        ))
