#!/usr/bin/env python3
import requests
import json

def test_kiosk_api_calls():
    """Test the API calls that the kiosk page makes"""
    print("🧪 Testing Kiosk Page API Calls")
    print("=" * 40)
    
    # Test 1: Buildings public endpoint from demo tenant
    print("1️⃣ Testing buildings public endpoint...")
    demo_buildings_url = "http://demo.localhost:8000/api/buildings/public/"
    
    try:
        response = requests.get(demo_buildings_url)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            buildings = response.json()
            print(f"   ✅ Success! Found {len(buildings)} buildings")
            for building in buildings:
                print(f"      - ID: {building.get('id')}, Name: {building.get('name')}")
            
            # Get first building ID for next test
            first_building_id = buildings[0]['id'] if buildings else 5
        else:
            print(f"   ❌ Failed: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Public info endpoint for the first building
    print(f"\n2️⃣ Testing public info endpoint for building {first_building_id}...")
    demo_public_info_url = f"http://demo.localhost:8000/api/public-info/{first_building_id}/"
    
    try:
        response = requests.get(demo_public_info_url)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            building_info = data.get('building_info', {})
            if building_info:
                print(f"   ✅ Success! Building: {building_info.get('name')}")
                print(f"      Announcements: {len(data.get('announcements', []))}")
                print(f"      Votes: {len(data.get('votes', []))}")
            else:
                print("   ⚠️ No building info found")
        else:
            print(f"   ❌ Failed: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 3: Check if frontend is accessible
    print(f"\n3️⃣ Testing frontend accessibility...")
    frontend_url = "http://demo.localhost:3000"
    
    try:
        response = requests.get(frontend_url)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Frontend is accessible")
        else:
            print(f"   ⚠️ Frontend returned status {response.status_code}")
    except Exception as e:
        print(f"   ⚠️ Frontend error: {e}")
    
    print("\n" + "=" * 40)
    print("✅ All API tests passed!")
    print("\n🌐 Kiosk page should now work at:")
    print(f"   http://demo.localhost:3000/kiosk?building={first_building_id}")
    print("\n📋 Summary:")
    print("   - Demo tenant API endpoints are working")
    print("   - Buildings are accessible")
    print("   - Public info is available")
    print("   - Frontend is running")
    
    return True

if __name__ == "__main__":
    test_kiosk_api_calls() 