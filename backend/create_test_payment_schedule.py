import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance, PaymentSchedule
from django.utils import timezone
import traceback

def create_test_payment_schedule():
    try:
        with schema_context('demo'):
            # Get the first scheduled maintenance
            maintenance = ScheduledMaintenance.objects.first()
            if not maintenance:
                print('❌ No ScheduledMaintenance found')
                return
            
            print(f'✅ Found ScheduledMaintenance: {maintenance.title}')
            print(f'   ID: {maintenance.id}')
            print(f'   Estimated cost: {maintenance.estimated_cost}')
            
            # Check if payment schedule already exists
            existing_schedule = PaymentSchedule.objects.filter(scheduled_maintenance=maintenance).first()
            if existing_schedule:
                print(f'✅ PaymentSchedule already exists: {existing_schedule.id}')
                print(f'   Payment type: {existing_schedule.payment_type}')
                print(f'   Total amount: {existing_schedule.total_amount}')
                print(f'   Advance percentage: {existing_schedule.advance_percentage}')
                return
            
            # Create a test payment schedule
            schedule = PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance,
                payment_type='advance_installments',  # 30% advance + installments
                total_amount=maintenance.estimated_cost or 450.00,
                advance_percentage=30,
                installment_count=3,
                installment_frequency='monthly',
                periodic_amount=0,
                periodic_frequency='monthly',
                start_date=timezone.now().date(),
                notes='Test payment schedule with 30% advance',
                created_by=None,  # No user for test
                is_active=True,
                status='active'
            )
            
            print(f'✅ Created PaymentSchedule: {schedule.id}')
            print(f'   Payment type: {schedule.payment_type}')
            print(f'   Total amount: {schedule.total_amount}')
            print(f'   Advance percentage: {schedule.advance_percentage}')
            print(f'   Installment count: {schedule.installment_count}')
            
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    create_test_payment_schedule()