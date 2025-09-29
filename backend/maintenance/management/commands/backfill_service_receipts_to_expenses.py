from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context
from maintenance.models import ServiceReceipt
from financial.models import Expense


CATEGORY_MAP = {
    'cleaning': 'cleaning',
    'elevator': 'elevator_maintenance',
    'heating': 'heating_maintenance',
    'electrical': 'electrical_maintenance',
    'plumbing': 'plumbing_maintenance',
    'security': 'security',
    'landscaping': 'garden_maintenance',
    'maintenance': 'building_maintenance',
    'repair': 'emergency_repair',
    'technical': 'building_maintenance',
}


class Command(BaseCommand):
    help = "Link existing ServiceReceipt rows to monthly financial.Expense entries, creating/aggregating per building/category/month."

    def add_arguments(self, parser):
        parser.add_argument('--schema', type=str, default='demo', help='Tenant schema to run against')

    def handle(self, *args, **options):
        schema = options['schema']
        created, aggregated, linked = 0, 0, 0
        with schema_context(schema):
            receipts = ServiceReceipt.objects.select_related('building', 'contractor').all()
            for r in receipts:
                if not r.service_date:
                    continue
                contractor_type = (r.contractor.service_type if r.contractor else 'maintenance') or 'maintenance'
                category = CATEGORY_MAP.get(contractor_type, 'building_maintenance')
                expense_date = r.service_date.replace(day=1)

                exp = Expense.objects.filter(
                    building=r.building,
                    category=category,
                    date__year=expense_date.year,
                    date__month=expense_date.month,
                    expense_type='regular',
                ).first()

                if exp:
                    old_amount = exp.amount
                    exp.amount = (exp.amount or 0) + r.amount
                    exp.save(update_fields=['amount'])
                    aggregated += 1
                else:
                    title = f"Δαπάνη: {(r.contractor.name if r.contractor else 'Συνεργείο')} - {str(r.description)[:40]}"
                    exp = Expense.objects.create(
                        building=r.building,
                        title=title,
                        amount=r.amount,
                        date=expense_date,
                        category=category,
                        distribution_type='by_participation_mills',
                        notes=f"Συνδεδεμένη με απόδειξη ID {r.id}",
                    )
                    created += 1

                if r.linked_expense_id != exp.id:
                    r.linked_expense = exp
                    r.save(update_fields=['linked_expense'])
                    linked += 1

        self.stdout.write(self.style.SUCCESS(
            f"Expenses created: {created}, aggregated: {aggregated}, receipts linked: {linked} (schema={schema})"
        ))


