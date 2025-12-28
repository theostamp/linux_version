import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet
import traceback

def test_dashboard_summary():
    try:
        with schema_context('demo'):
            factory = RequestFactory()
            request = factory.get('/api/financial/dashboard/summary/?building_id=1&month=2025-09')
            
            viewset = FinancialDashboardViewSet()
            viewset.request = request
            
            print('🔍 Testing financial dashboard summary endpoint...')
            print(f'Request path: {request.get_full_path()}')
            print(f'Query params: {request.GET}')
            
            response = viewset.summary(request)
            print(f'✅ Response status: {response.status_code}')
            if hasattr(response, 'data'):
                print(f'Response data keys: {list(response.data.keys())}')
                if 'error' in response.data:
                    print(f'Error message: {response.data["error"]}')
            else:
                print('No response data available')
            
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    test_dashboard_summary()