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

# Test the apartments_summary API endpoint for all apartments
with schema_context('demo'):
    print("🔍 Testing apartments_summary API endpoint for all apartments...")
    
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
            total_previous_balance = 0
            total_current_balance = 0
            
            print(f"\n🏠 All Apartments Data:")
            for i, apt in enumerate(response.data, 1):
                previous_balance = apt.get('previous_balance', 0)
                current_balance = apt.get('current_balance', 0)
                
                total_previous_balance += previous_balance
                total_current_balance += current_balance
                
                print(f"  {i}. Apartment {apt.get('number')}:")
                print(f"     Previous Balance: {previous_balance}€")
                print(f"     Current Balance: {current_balance}€")
                print(f"     Owner: {apt.get('owner_name')}")
            
            print(f"\n💰 SUMMARY:")
            print(f"  Total Previous Balance: {total_previous_balance}€")
            print(f"  Total Current Balance: {total_current_balance}€")
            
            # Check if previous_balance is present in all apartments
            apartments_with_previous_balance = sum(1 for apt in response.data if 'previous_balance' in apt)
            print(f"  Apartments with previous_balance field: {apartments_with_previous_balance}/{len(response.data)}")
            
            if apartments_with_previous_balance == len(response.data):
                print(f"\n✅ SUCCESS: All apartments have previous_balance field!")
            else:
                print(f"\n❌ ERROR: Some apartments missing previous_balance field!")
                
        else:
            print("❌ No data returned from API")
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n🎯 API Test Complete!")
