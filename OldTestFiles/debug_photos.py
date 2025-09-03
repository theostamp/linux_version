#!/usr/bin/env python3
"""
Debug script to check photo upload functionality
"""

import requests

def debug_photos():
    print("🔍 Debugging Photo Upload")
    print("=" * 40)
    
    session = requests.Session()
    
    # Step 1: Login
    print("\n1. Attempting login...")
    login_data = {
        'email': 'admin@demo.localhost',
        'password': 'admin123'
    }
    
    try:
        response = session.post("http://demo.localhost:8000/api/users/login/", json=login_data)
        if response.status_code == 200:
            print("✅ Login successful")
            user_data = response.json()
            print(f"   User: {user_data.get('user', {}).get('email', 'Unknown')}")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 2: Check recent requests
    print("\n2. Checking recent requests...")
    try:
        response = session.get("http://demo.localhost:8000/api/user-requests/")
        if response.status_code == 200:
            requests_data = response.json()
            requests_list = requests_data.get('results', [])
            print(f"✅ Found {len(requests_list)} requests")
            
            for req in requests_list[:5]:  # Check last 5 requests
                req_id = req.get('id')
                title = req.get('title', 'No title')
                photos = req.get('photos', [])
                print(f"   Request {req_id}: '{title}' - Photos: {len(photos)}")
                if photos:
                    for i, photo in enumerate(photos):
                        print(f"     Photo {i+1}: {photo}")
        else:
            print(f"❌ Failed to get requests: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting requests: {e}")
    
    # Step 3: Check specific request (ID 10)
    print("\n3. Checking request ID 10...")
    try:
        response = session.get("http://demo.localhost:8000/api/user-requests/10/")
        if response.status_code == 200:
            request_data = response.json()
            print("✅ Request 10 details:")
            print(f"   Title: {request_data.get('title', 'No title')}")
            print(f"   Description: {request_data.get('description', 'No description')}")
            photos = request_data.get('photos', [])
            print(f"   Photos: {len(photos)}")
            for i, photo in enumerate(photos):
                print(f"     Photo {i+1}: {photo}")
        else:
            print(f"❌ Failed to get request 10: {response.status_code}")
    except Exception as e:
        print(f"❌ Error getting request 10: {e}")
    
    print("\n💡 Manual testing instructions:")
    print("1. Go to http://demo.localhost:8080/requests/new")
    print("2. Fill in the form and upload a photo")
    print("3. Check the browser console for any errors")
    print("4. Submit the request")
    print("5. Go to the request detail page")

if __name__ == "__main__":
    debug_photos() 