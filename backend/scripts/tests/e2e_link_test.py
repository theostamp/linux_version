import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def main():
    from buildings.models import Building
    from maintenance.models import Contractor, ScheduledMaintenance, ServiceReceipt
    from financial.models import Expense

    results = {}

    with schema_context('demo'):
        # Ensure building exists
        building = Building.objects.filter(id=1).first()
        if not building:
            print('[E2E] ERROR: Building id=1 not found in demo schema')
            return

        # Ensure contractor exists
        contractor, _ = Contractor.objects.get_or_create(
            name='E2E Contractor',
            defaults={
                'service_type': 'maintenance',
                'status': 'active',
                'contact_person': 'Tester',
                'phone': '2100000000',
                'email': 'e2e@example.com',
            }
        )

        # Create scheduled maintenance
        scheduled = ScheduledMaintenance.objects.create(
            title='E2E Test Maintenance',
            description='Automated E2E link test record',
            building=building,
            contractor=contractor,
            scheduled_date=date.today(),
            estimated_duration=1,
            priority='medium',
            status='scheduled',
            estimated_cost=Decimal('123.45'),
            is_recurring=True,
            recurrence_frequency='monthly',
        )
        results['scheduled_id'] = scheduled.id

        # Create expense linked to scheduled maintenance
        expense = Expense.objects.create(
            building=building,
            title='E2E Linked Expense',
            amount=Decimal('50.00'),
            date=date.today(),
            category='building_maintenance',
            distribution_type='by_participation_mills',
            notes='E2E link test',
            linked_scheduled_maintenance=scheduled,
        )
        results['expense_id'] = expense.id

        # Create service receipt linked to scheduled maintenance
        receipt = ServiceReceipt.objects.create(
            contractor=contractor,
            building=building,
            service_date=date.today(),
            amount=Decimal('50.00'),
            description='E2E linked service receipt',
            payment_status='pending',
            scheduled_maintenance=scheduled,
        )
        results['receipt_id'] = receipt.id

        # Verify links
        results['expense_link_ok'] = (expense.linked_scheduled_maintenance_id == scheduled.id)
        results['receipt_link_ok'] = (receipt.scheduled_maintenance_id == scheduled.id)

    print('[E2E] OK:', results)

if __name__ == '__main__':
    main()



