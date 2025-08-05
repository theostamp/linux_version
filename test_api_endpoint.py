#!/usr/bin/env python3
"""
Test script για το API endpoint του dashboard
"""

import requests
import json

def test_dashboard_api():
    """Test το dashboard API endpoint"""
    
    # Test URL
    url = "http://demo.localhost:8000/api/financial/dashboard/summary/"
    params = {
        'building_id': 1,
        'month': '2025-08'
    }
    
    print(f"🔍 Testing API endpoint: {url}")
    print(f"📋 Parameters: {params}")
    
    try:
        # Χωρίς authentication (θα επιστρέψει 401)
        response = requests.get(url, params=params)
        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 401:
            print("✅ Expected 401 Unauthorized (no authentication)")
            print("💡 Το frontend πρέπει να έχει authentication token")
        else:
            print(f"📝 Response Content: {response.text[:500]}...")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error - Το API δεν είναι προσβάσιμο")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_with_auth():
    """Test με authentication"""
    
    # Πρώτα login για να πάρουμε token
    login_url = "http://demo.localhost:8000/api/users/login/"
    login_data = {
        'username': 'admin@demo.localhost',
        'password': 'admin123456'
    }
    
    try:
        print("\n🔐 Testing with authentication...")
        login_response = requests.post(login_url, json=login_data)
        
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            print(f"✅ Login successful, token: {token[:20]}...")
            
            # Test dashboard με token
            headers = {'Authorization': f'Bearer {token}'}
            url = "http://demo.localhost:8000/api/financial/dashboard/summary/"
            params = {'building_id': 1}
            
            response = requests.get(url, params=params, headers=headers)
            print(f"📊 Dashboard Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Dashboard API working!")
                print(f"📊 Data: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ Dashboard API Error: {response.text}")
        else:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            
    except Exception as e:
        print(f"❌ Authentication test error: {e}")

if __name__ == "__main__":
    test_dashboard_api()
    test_with_auth() 