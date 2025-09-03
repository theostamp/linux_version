#!/usr/bin/env python3
"""
Test script για επιβεβαίωση αυτόματης ενημέρωσης dashboard 
όταν αλλάζει το πακέτο υπηρεσιών
"""

import requests
import time

# Configuration
BASE_URL = "http://localhost:8000/api"
BUILDING_ID = 4  # Alkmanos building

def test_service_package_auto_update():
    """
    Test the automatic dashboard update when service package changes
    """
    print("🧪 Testing Service Package Auto-Update System")
    print("=" * 50)
    
    # Step 1: Get current financial dashboard data
    print("📊 Step 1: Getting current dashboard data...")
    try:
        dashboard_response = requests.get(f"{BASE_URL}/financial/dashboard/summary/?building_id={BUILDING_ID}")
        current_data = dashboard_response.json()
        
        print(f"✅ Current management fee: {current_data.get('management_fee_per_apartment', 'N/A')}€")
        print(f"✅ Current total cost: {current_data.get('total_management_cost', 'N/A')}€")
        
    except Exception as e:
        print(f"❌ Failed to get dashboard data: {e}")
        return False
    
    # Step 2: Get current building data
    print("\n🏢 Step 2: Getting current building data...")
    try:
        building_response = requests.get(f"{BASE_URL}/buildings/list/{BUILDING_ID}/")
        building_data = building_response.json()
        
        current_fee = building_data.get('management_fee_per_apartment', 0)
        apartments_count = building_data.get('apartments_count', 0)
        
        print(f"✅ Building management fee: {current_fee}€")
        print(f"✅ Apartments count: {apartments_count}")
        
    except Exception as e:
        print(f"❌ Failed to get building data: {e}")
        return False
    
    # Step 3: Get available service packages
    print("\n📦 Step 3: Getting available service packages...")
    try:
        packages_response = requests.get(f"{BASE_URL}/service-packages/")
        packages = packages_response.json()
        
        if not packages:
            print("⚠️  No service packages found. Creating a test package...")
            # Create a test package
            test_package = {
                "name": "Test Package Auto-Update",
                "description": "Test package for auto-update functionality",
                "fee_per_apartment": current_fee + 5,  # Different fee for testing
                "services_included": "Test service"
            }
            
            create_response = requests.post(f"{BASE_URL}/service-packages/", json=test_package)
            if create_response.status_code == 201:
                packages = [create_response.json()]
                print("✅ Test package created")
            else:
                print(f"❌ Failed to create test package: {create_response.text}")
                return False
        
        # Select first package for testing
        test_package = packages[0]
        print(f"✅ Using package: {test_package['name']} ({test_package['fee_per_apartment']}€)")
        
    except Exception as e:
        print(f"❌ Failed to get packages: {e}")
        return False
    
    # Step 4: Apply the service package
    print("\n🎯 Step 4: Applying service package...")
    try:
        apply_data = {
            "package_id": test_package['id'],
            "building_id": BUILDING_ID
        }
        
        apply_response = requests.post(f"{BASE_URL}/service-packages/apply/", json=apply_data)
        
        if apply_response.status_code == 200:
            result = apply_response.json()
            print("✅ Package applied successfully!")
            print(f"📝 Response: {result.get('message', 'Success')}")
            print(f"💰 New fee: {result.get('new_fee', test_package['fee_per_apartment'])}€")
        else:
            print(f"❌ Failed to apply package: {apply_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to apply package: {e}")
        return False
    
    # Step 5: Wait and verify dashboard update
    print("\n⏳ Step 5: Waiting 2 seconds for dashboard update...")
    time.sleep(2)
    
    try:
        updated_dashboard_response = requests.get(f"{BASE_URL}/financial/dashboard/summary/?building_id={BUILDING_ID}")
        updated_data = updated_dashboard_response.json()
        
        updated_fee = updated_data.get('management_fee_per_apartment', 0)
        expected_fee = test_package['fee_per_apartment']
        
        print(f"📊 Updated management fee: {updated_fee}€")
        print(f"🎯 Expected fee: {expected_fee}€")
        
        if abs(updated_fee - expected_fee) < 0.01:  # Allow for small floating point differences
            print("✅ Dashboard updated successfully! Auto-update working correctly.")
            success = True
        else:
            print("❌ Dashboard not updated. Auto-update may have failed.")
            success = False
            
    except Exception as e:
        print(f"❌ Failed to verify dashboard update: {e}")
        success = False
    
    # Summary
    print("\n" + "=" * 50)
    if success:
        print("🎉 SERVICE PACKAGE AUTO-UPDATE TEST: PASSED")
        print("✅ The dashboard automatically updates when service packages change!")
    else:
        print("❌ SERVICE PACKAGE AUTO-UPDATE TEST: FAILED")
        print("⚠️  Manual refresh may be required after package changes.")
    
    return success

if __name__ == "__main__":
    try:
        test_service_package_auto_update()
    except KeyboardInterrupt:
        print("\n\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")


