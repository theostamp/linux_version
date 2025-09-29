#!/usr/bin/env python3
"""
Simple test for Kiosk Backend API
"""

import requests
import json

def test_backend_apis():
    """Test backend API endpoints"""
    
    print("🧪 Testing Backend API Endpoints")
    print("=" * 50)
    
    # Test kiosk config endpoint
    try:
        url = "http://localhost:18000/api/kiosk/public/configs/get_by_building/?building_id=1"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Kiosk config endpoint working")
            print(f"   - Building: {data.get('building', 'N/A')}")
            print(f"   - Widgets count: {len(data.get('widgets', []))}")
            print(f"   - Settings: {data.get('settings', {})}")
        else:
            print(f"❌ Kiosk config endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing kiosk config endpoint: {e}")
    
    # Test public info endpoint
    try:
        url = "http://localhost:18000/api/public-info/1/"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Public info endpoint working")
            print(f"   - Announcements: {len(data.get('announcements', []))}")
            print(f"   - Votes: {len(data.get('votes', []))}")
            print(f"   - Building info: {data.get('building_info', {}).get('name', 'N/A')}")
        else:
            print(f"❌ Public info endpoint failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing public info endpoint: {e}")

if __name__ == "__main__":
    test_backend_apis()
