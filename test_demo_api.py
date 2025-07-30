#!/usr/bin/env python3
import requests
import json

# Test API calls for demo tenant
DEMO_API_BASE_URL = "http://demo.localhost:8000/api"

def test_demo_buildings_public():
    """Test the public buildings endpoint in demo tenant"""
    url = f"{DEMO_API_BASE_URL}/buildings/public/"
    
    print("🏢 Testing demo buildings public endpoint...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} buildings:")
            for building in data:
                print(f"  - ID: {building.get('id')}, Name: {building.get('name')}")
            return data
        else:
            print(f"❌ Failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_demo_public_info(building_id):
    """Test the public info endpoint in demo tenant"""
    url = f"{DEMO_API_BASE_URL}/public-info/{building_id}/"
    
    print(f"\n📊 Testing demo public info endpoint for building {building_id}...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            building_info = data.get('building_info', {})
            if building_info:
                print(f"✅ Success! Building info: {building_info.get('name', 'N/A')}")
                print(f"  Announcements: {len(data.get('announcements', []))}")
                print(f"  Votes: {len(data.get('votes', []))}")
            else:
                print("⚠️ No building info found")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Demo Tenant API Endpoints")
    print("=" * 40)
    
    # Test buildings public endpoint
    buildings_data = test_demo_buildings_public()
    
    if buildings_data:
        # Test public info endpoint with the first building ID
        first_building_id = buildings_data[0]['id'] if buildings_data else 5
        public_info_success = test_demo_public_info(first_building_id)
        
        print("\n" + "=" * 40)
        if public_info_success:
            print("✅ All tests passed! Demo tenant API is working correctly.")
        else:
            print("❌ Public info test failed.")
    else:
        print("❌ Buildings test failed.") 