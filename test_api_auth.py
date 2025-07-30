#!/usr/bin/env python3
import requests
import json

# API base URL
API_BASE_URL = "http://localhost:8000/api"

def test_login():
    """Test login and get access token"""
    login_url = f"{API_BASE_URL}/users/login/"
    login_data = {
        "email": "theostam1966@gmail.com",
        "password": "admin123"
    }
    
    print("🔐 Testing login...")
    try:
        response = requests.post(login_url, json=login_data)
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            print(f"✅ Login successful! Access token: {access_token[:20]}..." if access_token else "❌ No access token received")
            return access_token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_buildings_api(access_token):
    """Test the buildings API with authentication"""
    buildings_url = f"{API_BASE_URL}/buildings/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("\n🏢 Testing buildings API...")
    try:
        response = requests.get(buildings_url, headers=headers)
        print(f"Buildings API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Buildings API successful! Found {len(data.get('results', []))} buildings")
            return True
        else:
            print(f"❌ Buildings API failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Buildings API error: {e}")
        return False

def test_buildings_api_without_auth():
    """Test the buildings API without authentication"""
    buildings_url = f"{API_BASE_URL}/buildings/"
    
    print("\n🏢 Testing buildings API without authentication...")
    try:
        response = requests.get(buildings_url)
        print(f"Buildings API (no auth) response status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Correctly requires authentication")
            return True
        else:
            print(f"❌ Unexpected response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Buildings API (no auth) error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing API Authentication")
    print("=" * 40)
    
    # Test login
    access_token = test_login()
    
    if access_token:
        # Test buildings API with authentication
        test_buildings_api(access_token)
    else:
        print("❌ Cannot test buildings API without access token")
    
    # Test buildings API without authentication
    test_buildings_api_without_auth()
    
    print("\n" + "=" * 40)
    print("✅ API authentication test completed!") 