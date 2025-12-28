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
from rest_framework.test import force_authenticate
from users.models import CustomUser

# Test the apartments_summary API endpoint
with schema_context('demo'):
    print("🔍 Testing apartments_summary API endpoint...")
    
    # Create a test request with proper query_params
    factory = RequestFactory()
    request = factory.get('/api/financial/building/1/apartments-summary/?month=2025-06')
    
    # Add query_params attribute to the request
    request.query_params = request.GET
    
    # Create a test user (admin)
    try:
        user = CustomUser.objects.get(email='admin@demo.localhost')
        force_authenticate(request, user=user)
    except CustomUser.DoesNotExist:
        print("⚠️ Admin user not found, using anonymous request")
    
    # Create the view and call the method
    view = FinancialDashboardViewSet()
    view.request = request
    
    try:
        # Call the apartments_summary method
        response = view.apartments_summary(request, pk=1)
        
        print(f"✅ API Response Status: {response.status_code}")
        print(f"📊 Response Data Length: {len(response.data)}")
        
        if response.data and len(response.data) > 0:
            first_apartment = response.data[0]
            print("\n🏠 First Apartment Data:")
            print(f"  ID: {first_apartment.get('id')}")
            print(f"  Number: {first_apartment.get('number')}")
            print(f"  Apartment Number: {first_apartment.get('apartment_number')}")
            print(f"  Owner: {first_apartment.get('owner_name')}")
            print(f"  Current Balance: {first_apartment.get('current_balance')}€")
            print(f"  Previous Balance: {first_apartment.get('previous_balance')}€")
            print(f"  Monthly Due: {first_apartment.get('monthly_due')}€")
            
            print("\n🔍 All Available Fields:")
            for field, value in first_apartment.items():
                print(f"  {field}: {value}")
            
            # Check if previous_balance is present
            if 'previous_balance' in first_apartment:
                print("\n✅ SUCCESS: previous_balance field is present!")
                print(f"   Value: {first_apartment['previous_balance']}€")
            else:
                print("\n❌ ERROR: previous_balance field is missing!")
                
        else:
            print("❌ No data returned from API")
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n🎯 API Test Complete!")
