import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService

# All database operations within tenant context
with schema_context('demo'):
    print("=== Debugging Previous Obligations Display ===")
    
    service = FinancialDashboardService(building_id=1)
    
    # Test current month (no month parameter)
    print("\n1. Current View (no month):")
    current_data = service.get_summary()
    print(f"  previous_obligations: {current_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: {current_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: {current_data.get('total_balance', 'NOT FOUND')}")
    
    # Test September 2025
    print("\n2. September 2025 View:")
    september_data = service.get_summary('2025-09')
    print(f"  previous_obligations: {september_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: {september_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: {september_data.get('total_balance', 'NOT FOUND')}")
    
    # Test August 2025
    print("\n3. August 2025 View:")
    august_data = service.get_summary('2025-08')
    print(f"  previous_obligations: {august_data.get('previous_obligations', 'NOT FOUND')}")
    print(f"  current_obligations: {august_data.get('current_obligations', 'NOT FOUND')}")
    print(f"  total_balance: {august_data.get('total_balance', 'NOT FOUND')}")
    
    print("\n4. Debug Full Dashboard Data Structure:")
    for month, label in [('2025-09', 'September'), ('2025-08', 'August')]:
        print(f"\n  {label} 2025 Full Data:")
        data = service.get_summary(month)
        for key, value in data.items():
            if 'obligation' in key.lower() or 'balance' in key.lower():
                print(f"    {key}: {value}")
    
    print("\n5. Test API Call Directly:")
    # Test the direct API call that frontend would make
    from financial.views import FinancialDashboardView
    from django.test import RequestFactory
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    factory = RequestFactory()
    
    # Create test user
    test_user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'password': 'test'}
    )
    
    # Test September 2025 API call
    request = factory.get('/financial/dashboard/', {'building_id': 1, 'month': '2025-09'})
    request.user = test_user
    
    view = FinancialDashboardView()
    response = view.get(request)
    
    if hasattr(response, 'data'):
        print(f"  API Response status: {response.status_code}")
        dashboard_data = response.data
        print(f"  previous_obligations in API: {dashboard_data.get('previous_obligations', 'NOT FOUND')}")
        print(f"  current_obligations in API: {dashboard_data.get('current_obligations', 'NOT FOUND')}")
    else:
        print(f"  API Response: {response}")
    
    print("\n=== Debug Complete ===")
    print("Key findings:")
    print("- Check if previous_obligations field exists in all API responses")
    print("- Verify the calculation logic in FinancialDashboardService")
    print("- Ensure frontend is correctly reading the previous_obligations value")