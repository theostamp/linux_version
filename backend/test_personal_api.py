"""
Test personal apartment API endpoints.
"""
import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
import json

print("=" * 80)
print("TEST PERSONAL APARTMENT API")
print("=" * 80)

with schema_context('demo'):
    # Get first apartment
    apartment = Apartment.objects.first()

    if not apartment:
        print("❌ No apartments found")
        sys.exit(1)

    print(f"\n📋 Test Apartment:")
    print(f"   Number: {apartment.number}")
    print(f"   Owner: {apartment.owner_name}")
    print(f"   Token: {apartment.kiosk_token}")

    # Import view
    from apartments.views_personal import apartment_personal_dashboard

    # Create mock request
    from rest_framework.test import APIRequestFactory
    from types import SimpleNamespace

    factory = APIRequestFactory()
    request = factory.get(f'/api/apartments/personal/{apartment.kiosk_token}/dashboard/')

    # Call view
    response = apartment_personal_dashboard(request, str(apartment.kiosk_token))

    print(f"\n✅ API Response Status: {response.status_code}")

    if response.status_code == 200:
        data = response.data
        print(f"\n📊 Dashboard Data:")
        print(f"   Apartment: {data['apartment']['number']}")
        print(f"   Building: {data['apartment']['building']['name']}")
        print(f"   Current Balance: {data['current_balance']}€")

        if data['common_expenses']:
            print(f"\n💰 Current Common Expenses:")
            print(f"   Period: {data['common_expenses']['period']}")
            print(f"   Amount: {data['common_expenses']['amount']}€")
            print(f"   Previous Balance: {data['common_expenses']['previous_balance']}€")
            print(f"   Total Due: {data['common_expenses']['total_due']}€")
        else:
            print(f"\n💰 No current common expenses")

        print(f"\n📢 Announcements: {len(data['announcements'])}")
        print(f"💳 Recent Transactions: {len(data['transactions'])}")
        print(f"🔧 Maintenance Requests: {len(data['maintenance_requests'])}")

        print(f"\n🔗 QR Code URL:")
        print(f"   http://localhost:3000/my-apartment/{apartment.kiosk_token}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
