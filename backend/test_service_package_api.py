import os
import sys
import django
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import RequestFactory
from buildings.views import ServicePackageViewSet, BuildingViewSet
from buildings.models import Building, ServicePackage
from django.contrib.auth import get_user_model

# All database operations within tenant context
with schema_context('demo'):
    print("=== TESTING SERVICE PACKAGE APPLICATION ===\n")
    
    # Create a test user
    User = get_user_model()
    test_user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'is_staff': True, 'is_superuser': True}
    )
    
    # Check current building state
    building = Building.objects.get(id=1)
    print(f"🏢 Building: {building.name}")
    print(f"   Current management_fee_per_apartment: {building.management_fee_per_apartment}")
    print(f"   Current service_package: {building.service_package}")
    print()
    
    # Check if there are any service packages
    service_packages = ServicePackage.objects.filter(is_active=True)
    print(f"📦 Available Service Packages: {service_packages.count()}")
    
    if service_packages.exists():
        for pkg in service_packages:
            print(f"   ID {pkg.id}: {pkg.name} - {pkg.fee_per_apartment}€/apt/month")
        print()
        
        # Test applying the first package
        test_package = service_packages.first()
        print(f"🧪 TESTING: Applying package '{test_package.name}' to building")
        print(f"   Package fee: {test_package.fee_per_apartment}€/apt/month")
        
        # Create mock request
        factory = RequestFactory()
        request_data = {'building_id': building.id}
        request = factory.post(
            f'/buildings/service-packages/{test_package.id}/apply_to_building/',
            data=json.dumps(request_data),
            content_type='application/json'
        )
        request.user = test_user
        
        # Create viewset and call the method
        viewset = ServicePackageViewSet()
        viewset.request = request
        
        # Mock the get_object method
        def mock_get_object():
            return test_package
        viewset.get_object = mock_get_object
        
        response = viewset.apply_to_building(request, pk=test_package.id)
        
        print(f"📋 API Response:")
        print(f"   Status: {response.status_code}")
        print(f"   Data: {response.data}")
        
        if response.status_code == 200:
            print("   ✅ API call successful!")
            
            # Check if building was actually updated
            building.refresh_from_db()
            print(f"\n🔄 Building after update:")
            print(f"   management_fee_per_apartment: {building.management_fee_per_apartment}")
            print(f"   service_package: {building.service_package}")
            print(f"   service_package.name: {building.service_package.name if building.service_package else 'None'}")
            
            if building.management_fee_per_apartment == test_package.fee_per_apartment:
                print("   ✅ management_fee_per_apartment updated correctly!")
            else:
                print(f"   ❌ management_fee_per_apartment NOT updated (expected: {test_package.fee_per_apartment})")
                
            if building.service_package and building.service_package.id == test_package.id:
                print("   ✅ service_package updated correctly!")
            else:
                print(f"   ❌ service_package NOT updated (expected: {test_package.id})")
        else:
            print(f"   ❌ API call failed!")
    else:
        print("❌ No service packages found!")
        print("Creating a test service package...")
        
        # Create a test service package
        test_package = ServicePackage.objects.create(
            name="Test Package",
            description="Test package for debugging",
            fee_per_apartment=10.00,
            services_included=["Test service 1", "Test service 2"],
            is_active=True
        )
        
        print(f"✅ Created test package: {test_package.name}")
        
        # Now test the same logic as above
        print(f"🧪 TESTING: Applying test package to building")
        
        factory = RequestFactory()
        request_data = {'building_id': building.id}
        request = factory.post(
            f'/buildings/service-packages/{test_package.id}/apply_to_building/',
            data=json.dumps(request_data),
            content_type='application/json'
        )
        request.user = test_user
        
        viewset = ServicePackageViewSet()
        viewset.request = request
        
        def mock_get_object():
            return test_package
        viewset.get_object = mock_get_object
        
        response = viewset.apply_to_building(request, pk=test_package.id)
        
        print(f"📋 API Response:")
        print(f"   Status: {response.status_code}")
        print(f"   Data: {response.data}")
        
        if response.status_code == 200:
            building.refresh_from_db()
            print(f"\n🔄 Building after update:")
            print(f"   management_fee_per_apartment: {building.management_fee_per_apartment}")
            print(f"   service_package: {building.service_package.name if building.service_package else 'None'}")
            
            if building.management_fee_per_apartment == test_package.fee_per_apartment:
                print("   ✅ SUCCESS: Database updated correctly!")
            else:
                print(f"   ❌ FAILED: Database not updated")
    
    # Final check: Show what the UI should see
    print(f"\n📊 FINAL STATE FOR UI:")
    building.refresh_from_db()
    print(f"   Building management_fee_per_apartment: {building.management_fee_per_apartment}€")
    print(f"   Service package: {building.service_package.name if building.service_package else 'None'}")
    print(f"   Total monthly cost: {building.management_fee_per_apartment * building.apartments_count}€")