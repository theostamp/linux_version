"""
Django management command to create monthly notification tasks.
Usage: python manage.py create_monthly_tasks --month 10 --year 2025
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_tenants.utils import schema_context
from datetime import date
from notifications.models import MonthlyNotificationTask, NotificationTemplate
from buildings.models import Building


class Command(BaseCommand):
    help = 'Create monthly notification tasks for common expense bills'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=int,
            help='Month number (1-12). Default: next month',
        )
        parser.add_argument(
            '--year',
            type=int,
            help='Year (e.g., 2025). Default: current year',
        )
        parser.add_argument(
            '--building',
            type=int,
            help='Building ID (optional). If not specified, creates for all buildings',
        )
        parser.add_argument(
            '--schema',
            type=str,
            default='demo',
            help='Tenant schema name. Default: demo',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip if task already exists for this period',
        )

    def handle(self, *args, **options):
        schema = options['schema']

        with schema_context(schema):
            # Determine period
            now = timezone.now()
            month = options.get('month') or (now.month % 12) + 1
            year = options.get('year') or (now.year if month > now.month else now.year + 1)

            if month < 1 or month > 12:
                self.stdout.write(self.style.ERROR(f'Invalid month: {month}'))
                return

            period_month = date(year, month, 1)

            self.stdout.write(self.style.SUCCESS(f'\n{"="*80}'))
            self.stdout.write(self.style.SUCCESS(f'CREATE MONTHLY TASKS - {period_month.strftime("%B %Y")}'))
            self.stdout.write(self.style.SUCCESS(f'{"="*80}\n'))

            # Get buildings
            building_id = options.get('building')
            if building_id:
                buildings = Building.objects.filter(id=building_id)
                if not buildings.exists():
                    self.stdout.write(self.style.ERROR(f'Building ID {building_id} not found'))
                    return
            else:
                buildings = Building.objects.all()

            if buildings.count() == 0:
                self.stdout.write(self.style.ERROR('No buildings found'))
                return

            self.stdout.write(f'Buildings: {buildings.count()}\n')

            # Get template for common expenses
            template = NotificationTemplate.objects.filter(
                category='payment',
                name__icontains='κοινόχρηστ'
            ).first()

            if not template:
                self.stdout.write(self.style.WARNING(
                    'No common expense template found. Tasks will be created without template.'
                ))

            # Create tasks
            created_count = 0
            skipped_count = 0

            for building in buildings:
                # Check if task already exists
                existing = MonthlyNotificationTask.objects.filter(
                    building=building,
                    task_type='common_expense',
                    period_month=period_month
                ).first()

                if existing:
                    if options['skip_existing']:
                        self.stdout.write(
                            f'  - {building.name or building.street}: '
                            f'SKIPPED (status: {existing.status})'
                        )
                        skipped_count += 1
                        continue
                    else:
                        self.stdout.write(
                            f'  - {building.name or building.street}: '
                            f'Deleting existing task (status: {existing.status})'
                        )
                        existing.delete()

                # Create new task
                task = MonthlyNotificationTask.objects.create(
                    task_type='common_expense',
                    building=building,
                    template=template,
                    day_of_month=31,
                    time_to_send='09:00',
                    auto_send_enabled=True,
                    period_month=period_month,
                    status='pending_confirmation'
                )

                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ {building.name or building.street}: '
                        f'Task #{task.id} created'
                    )
                )

            # Summary
            self.stdout.write(f'\n{"="*80}')
            self.stdout.write(self.style.SUCCESS(f'SUMMARY'))
            self.stdout.write(f'{"="*80}')
            self.stdout.write(f'Created: {created_count}')
            self.stdout.write(f'Skipped: {skipped_count}')
            self.stdout.write(f'Total: {buildings.count()}')
            self.stdout.write(f'\n{"="*80}\n')

            if created_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ {created_count} monthly tasks created successfully!\n'
                    )
                )
                self.stdout.write('Next steps:')
                self.stdout.write('1. Tasks will appear in dashboard modal on day 1 of the month')
                self.stdout.write('2. Admin can confirm or enable auto-send')
                self.stdout.write('3. Or manually trigger: MonthlyTaskService.execute_task(task, user)\n')
