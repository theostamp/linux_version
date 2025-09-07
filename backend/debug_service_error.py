import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
import traceback

def test_financial_dashboard_service():
    try:
        with schema_context('demo'):
            print('🔍 Testing FinancialDashboardService...')
            
            service = FinancialDashboardService(1)  # building_id = 1
            print('✅ Service created successfully')
            
            print('🔍 Calling get_summary...')
            summary = service.get_summary('2025-09')
            print('✅ get_summary completed successfully')
            print(f'Summary keys: {list(summary.keys())}')
            
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    test_financial_dashboard_service()