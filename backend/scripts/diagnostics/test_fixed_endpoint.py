import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet
from users.models import CustomUser

# All database operations within tenant context
with schema_context('demo'):
    print("=== Testing Fixed apartment_balances Endpoint ===")
    
    # Create test user (required for the view)
    try:
        user = CustomUser.objects.get(email='test@example.com')
    except CustomUser.DoesNotExist:
        user = CustomUser.objects.create_user(email='test@example.com', password='testpass')
    
    # Create request factory
    factory = RequestFactory()
    
    # Test the apartment_balances endpoint
    print("\n🔍 Testing /financial/dashboard/apartment_balances/?building_id=1&month=2025-09")
    
    request = factory.get('/financial/dashboard/apartment_balances/?building_id=1&month=2025-09')
    request.user = user
    request.query_params = request.GET  # Required for ViewSets
    
    # Create viewset instance
    viewset = FinancialDashboardViewSet()
    viewset.request = request
    
    # Call apartment_balances method
    response = viewset.apartment_balances(request)
    
    print(f"📊 Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.data
        apartments = data.get('apartments', [])
        summary = data.get('summary', {})
        
        print(f"\n✅ SUCCESS! Got {len(apartments)} apartments")
        
        # Show first few apartments
        for i, apt in enumerate(apartments[:3]):
            print(f"\n  Apartment {apt.get('apartment_number', 'N/A')}:")
            print(f"    previous_balance: €{apt.get('previous_balance', 'N/A')}")
            print(f"    net_obligation: €{apt.get('net_obligation', 'N/A')}")
            print(f"    current_balance: €{apt.get('current_balance', 'N/A')}")
            print(f"    status: {apt.get('status', 'N/A')}")
        
        print(f"\n📋 Summary:")
        print(f"  total_net_obligations: €{summary.get('total_net_obligations', 0):.2f}")
        print(f"  active_count: {summary.get('active_count', 0)}")
        print(f"  debt_count: {summary.get('debt_count', 0)}")
        
        print(f"\n🎯 Frontend should now show:")
        total_previous = sum(float(apt.get('previous_balance', 0)) for apt in apartments)
        total_net = sum(float(apt.get('net_obligation', 0)) for apt in apartments)
        print(f"  Total previous_balance: €{total_previous:.2f}")
        print(f"  Total net_obligation: €{total_net:.2f}")
        
        if total_previous > 0 and total_net > 0:
            print(f"  ✅ Frontend will show apartment balances instead of €0.00!")
        else:
            print(f"  ❌ Still showing €0.00 - need further investigation")
    
    else:
        print(f"❌ ERROR: {response.status_code}")
        print(f"   Data: {response.data}")