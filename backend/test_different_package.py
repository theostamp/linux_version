import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from rest_framework.test import APIRequestFactory
from buildings.views import ServicePackageViewSet
from buildings.models import Building, ServicePackage
from django.contrib.auth import get_user_model

# All database operations within tenant context
with schema_context('demo'):
    print("=== TESTING DIFFERENT SERVICE PACKAGE ===\n")
    
    User = get_user_model()
    test_user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'is_staff': True, 'is_superuser': True}
    )
    
    building = Building.objects.get(id=1)
    print(f"🏢 Building: {building.name}")
    print(f"   Before: {building.management_fee_per_apartment}€ ({building.service_package.name if building.service_package else 'None'})")
    
    # Find a different package
    packages = ServicePackage.objects.filter(is_active=True)
    current_package = building.service_package
    different_package = None
    
    for pkg in packages:
        if current_package is None or pkg.id != current_package.id:
            different_package = pkg
            break
    
    if different_package:
        print(f"📦 Applying: {different_package.name} ({different_package.fee_per_apartment}€)")
        
        # Test the API
        factory = APIRequestFactory()
        request = factory.post(
            f'/buildings/service-packages/{different_package.id}/apply_to_building/',
            {'building_id': building.id},
            format='json'
        )
        request.user = test_user
        
        viewset = ServicePackageViewSet()
        viewset.request = request
        
        def mock_get_object():
            return different_package
        viewset.get_object = mock_get_object
        
        response = viewset.apply_to_building(request, pk=different_package.id)
        
        print(f"📋 API Response: {response.status_code}")
        print(f"   Data: {response.data}")
        
        if response.status_code == 200:
            building.refresh_from_db()
            print(f"✅ SUCCESS!")
            print(f"   After: {building.management_fee_per_apartment}€ ({building.service_package.name if building.service_package else 'None'})")
            print(f"   Total monthly cost: {building.management_fee_per_apartment * building.apartments_count}€")
            
            # Verify the frontend will get updated data
            print(f"\n📱 FRONTEND DATA:")
            print(f"   Management fee: {building.management_fee_per_apartment}€/apt/month")
            print(f"   Service package: {building.service_package.name}")
            print(f"   Package ID: {building.service_package.id}")
            print(f"   Total cost: {building.management_fee_per_apartment * building.apartments_count}€/month")
            
        else:
            print(f"❌ FAILED: {response.data}")
    else:
        print("❌ No different package found!")