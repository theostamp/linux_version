import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory
from financial.views import FinancialDashboardViewSet
from buildings.models import Building
from apartments.models import Apartment
from django.contrib.auth import get_user_model

# All database operations within tenant context
with schema_context('demo'):
    print("=== TESTING APARTMENT BALANCES WITH MANAGEMENT FEES ===\n")
    
    User = get_user_model()
    test_user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'is_staff': True, 'is_superuser': True}
    )
    
    building = Building.objects.get(id=1)
    print(f"🏢 Building: {building.name}")
    print(f"   Service package: {building.service_package.name if building.service_package else 'None'}")
    print(f"   Management fee per apartment: {building.management_fee_per_apartment}€")
    print(f"   Total apartments: {building.apartments_count}")
    print()
    
    # Test the API
    factory = APIRequestFactory()
    request = factory.get('/api/financial/apartment-balances/?building_id=1&month=2025-09')
    request.user = test_user
    # Add query_params to request (DRF adds this automatically)
    request.query_params = request.GET
    
    viewset = FinancialDashboardViewSet()
    viewset.request = request
    response = viewset.apartment_balances(request)
    
    print(f"📋 API Response Status: {response.status_code}")
    if response.status_code == 200:
        data = response.data
        print(f"   Response type: {type(data)}")
        print(f"   Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        
        if isinstance(data, list) and data:
            first_apartment = data[0]
        elif isinstance(data, dict) and 'apartments' in data:
            apartments = data['apartments']
            print(f"   Total apartments returned: {len(apartments)}")
            if apartments:
                first_apartment = apartments[0]
            else:
                print("   No apartments in response")
                first_apartment = None
        else:
            print(f"   Unexpected data structure: {data}")
            first_apartment = None
        
        if first_apartment:
            print(f"\n📊 FIRST APARTMENT DETAILS:")
            print(f"   Apartment: {first_apartment['apartment_number']}")
            print(f"   Total obligations: {first_apartment['total_obligations']}€")
            print(f"   Total payments: {first_apartment['total_payments']}€")
            print(f"   Net obligation: {first_apartment['net_obligation']}€")
            print(f"   Status: {first_apartment['status']}")
            
            print(f"\n📋 EXPENSE BREAKDOWN:")
            for expense in first_apartment['expense_breakdown']:
                print(f"   - {expense['expense_title']}: {expense['share_amount']}€")
            
            # Calculate expected total
            expected_expense_total = 175.0  # From previous calculations
            expected_management_fee = float(building.management_fee_per_apartment)
            expected_total = expected_expense_total + expected_management_fee
            
            print(f"\n🧮 EXPECTED VS ACTUAL:")
            print(f"   Expected expense total: {expected_expense_total}€")
            print(f"   Expected management fee: {expected_management_fee}€")
            print(f"   Expected total: {expected_total}€")
            print(f"   Actual total: {first_apartment['total_obligations']}€")
            
            if abs(float(first_apartment['total_obligations']) - expected_total) < 0.01:
                print("   ✅ SUCCESS: Totals match!")
            else:
                print("   ❌ ERROR: Totals don't match!")
        
        # Calculate building total
        if isinstance(data, dict) and 'apartments' in data:
            apartments = data['apartments']
            building_total = sum(float(apt['total_obligations']) for apt in apartments)
            apartment_count = len(apartments)
        elif isinstance(data, list):
            apartments = data
            building_total = sum(float(apt['total_obligations']) for apt in apartments)
            apartment_count = len(apartments)
        else:
            building_total = 0
            apartment_count = 0
            
        expected_building_total = 355.0  # 175€ expenses + 180€ management (18€ x 10 apartments)
        
        print(f"\n🏢 BUILDING TOTALS:")
        print(f"   Apartments processed: {apartment_count}")
        print(f"   Calculated total: {building_total}€")
        print(f"   Expected total: {expected_building_total}€")
        
        if abs(building_total - expected_building_total) < 0.01:
            print("   ✅ SUCCESS: Building total matches!")
        else:
            print("   ❌ ERROR: Building total doesn't match!")
    else:
        print(f"   ❌ ERROR: API returned status {response.status_code}")
        print(f"   Response: {response.data if hasattr(response, 'data') else response.content}")