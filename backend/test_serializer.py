import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from maintenance.models import ScheduledMaintenance
from maintenance.serializers import ScheduledMaintenanceSerializer, ScheduledMaintenanceWithPaymentsSerializer
import traceback

def test_serializer():
    try:
        with schema_context('demo'):
            # Get the first scheduled maintenance
            maintenance = ScheduledMaintenance.objects.select_related('contractor', 'building').first()
            if not maintenance:
                print('❌ No ScheduledMaintenance found')
                return
            
            print(f'✅ Found ScheduledMaintenance: {maintenance.title}')
            print(f'   ID: {maintenance.id}')
            
            # Check if it has payment_schedule
            try:
                schedule = maintenance.payment_schedule
                print(f'✅ Has payment_schedule: {schedule.id if schedule else None}')
                if schedule:
                    print(f'   Payment type: {schedule.payment_type}')
                    print(f'   Total amount: {schedule.total_amount}')
            except Exception as e:
                print(f'❌ Error accessing payment_schedule: {e}')
            
            # Test ScheduledMaintenanceSerializer
            print('\\n🔍 Testing ScheduledMaintenanceSerializer...')
            serializer1 = ScheduledMaintenanceSerializer(maintenance)
            data1 = serializer1.data
            print(f'   Has payment_config: {"payment_config" in data1}')
            if 'payment_config' in data1:
                print(f'   Payment config: {data1["payment_config"]}')
            
            # Test ScheduledMaintenanceWithPaymentsSerializer
            print('\\n🔍 Testing ScheduledMaintenanceWithPaymentsSerializer...')
            serializer2 = ScheduledMaintenanceWithPaymentsSerializer(maintenance)
            data2 = serializer2.data
            print(f'   Has payment_config: {"payment_config" in data2}')
            print(f'   Has payment_schedule: {"payment_schedule" in data2}')
            if 'payment_config' in data2:
                print(f'   Payment config: {data2["payment_config"]}')
            if 'payment_schedule' in data2:
                print(f'   Payment schedule: {data2["payment_schedule"]}')
            
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    test_serializer()