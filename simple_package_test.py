import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building, ServicePackage

# All database operations within tenant context
with schema_context('demo'):
    print("=== SIMPLE SERVICE PACKAGE TEST ===\n")
    
    # Get building and service packages
    building = Building.objects.get(id=1)
    packages = ServicePackage.objects.filter(is_active=True)
    
    print(f"🏢 Building: {building.name}")
    print(f"   Current management_fee: {building.management_fee_per_apartment}€")
    print(f"   Current package: {building.service_package}")
    print()
    
    if packages.exists():
        # Choose a different package
        current_package = building.service_package
        different_package = None
        
        for pkg in packages:
            if current_package is None or pkg.id != current_package.id:
                different_package = pkg
                break
        
        if different_package:
            print(f"📦 Applying package: {different_package.name}")
            print(f"   Fee: {different_package.fee_per_apartment}€")
            
            # Apply the package directly (simulating the API logic)
            old_fee = building.management_fee_per_apartment
            
            building.service_package = different_package
            building.management_fee_per_apartment = different_package.fee_per_apartment
            building.save()
            
            print(f"   ✅ Direct database update successful!")
            
            # Verify the change
            building.refresh_from_db()
            print(f"\n🔄 Verification:")
            print(f"   Old fee: {old_fee}€")
            print(f"   New fee: {building.management_fee_per_apartment}€")
            print(f"   New package: {building.service_package.name if building.service_package else 'None'}")
            
            if building.management_fee_per_apartment == different_package.fee_per_apartment:
                print("   ✅ SUCCESS: Database updated correctly!")
                
                # Test reading the data back
                print(f"\n📊 UI DATA:")
                total_monthly_cost = building.management_fee_per_apartment * building.apartments_count
                print(f"   Fee per apartment: {building.management_fee_per_apartment}€/month")
                print(f"   Total monthly cost: {total_monthly_cost}€/month")
                print(f"   Service package: {building.service_package.name}")
            else:
                print("   ❌ ERROR: Database not updated correctly!")
        else:
            print("❌ No different package found to test with")
    else:
        print("❌ No service packages found!")
    
    # Now let's check if there are any permission issues by looking at the ViewSet permissions
    print(f"\n🔐 CHECKING PERMISSIONS:")
    from buildings.views import ServicePackageViewSet
    
    viewset = ServicePackageViewSet()
    permissions = viewset.get_permissions()
    print(f"   Permission classes: {[p.__class__.__name__ for p in permissions]}")
    
    # Check if the endpoint is properly registered
    print(f"\n🛣️  CHECKING URL ROUTING:")
    from buildings import urls
    print(f"   URLs file exists: {hasattr(urls, 'urlpatterns')}")
    
    # Check if the model has all required fields
    print(f"\n🗂️  CHECKING MODEL:")
    print(f"   Building has service_package field: {hasattr(Building, 'service_package')}")
    print(f"   Building has management_fee_per_apartment field: {hasattr(Building, 'management_fee_per_apartment')}")
    
    # Final state
    print(f"\n🎯 FINAL BUILDING STATE:")
    building.refresh_from_db()
    print(f"   ID: {building.id}")
    print(f"   Name: {building.name}")
    print(f"   Management fee: {building.management_fee_per_apartment}€")
    print(f"   Service package: {building.service_package.name if building.service_package else 'None'}")
    print(f"   Package ID: {building.service_package.id if building.service_package else 'None'}")
    print(f"   Total apartments: {building.apartments_count}")
    print(f"   Total monthly cost: {building.management_fee_per_apartment * building.apartments_count}€")