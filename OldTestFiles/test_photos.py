#!/usr/bin/env python3
"""
Test script to create a request with photos
"""

import requests
import json
import os

def test_photos():
    print("🧪 Testing Photo Upload Functionality")
    print("=" * 50)
    
    session = requests.Session()
    
    # Step 1: Login
    print("\n1. Attempting login...")
    login_data = {
        'email': 'test@demo.localhost',
        'password': 'test123'
    }
    
    try:
        response = session.post("http://localhost:8000/api/users/login/", json=login_data)
        if response.status_code == 200:
            print("✅ Login successful")
            user_data = response.json()
            print(f"   User: {user_data.get('user', {}).get('email', 'Unknown')}")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            print("\n💡 Manual testing instructions:")
            print("   1. Go to http://localhost:8080")
            print("   2. Log in with any user")
            print("   3. Go to http://localhost:8080/requests/new")
            print("   4. Upload the test_image.svg file")
            print("   5. Submit the request")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    try:
        response = session.post("http://localhost:8000/api/users/login/", json=login_data)
        if response.status_code == 200:
            print("✅ Login successful")
            user_data = response.json()
            print(f"   User: {user_data.get('user', {}).get('email', 'Unknown')}")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            print("\n💡 Try these credentials:")
            print("   - Email: admin@example.com")
            print("   - Password: admin123")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 2: Get buildings
    print("\n2. Getting buildings...")
    try:
        response = session.get("http://localhost:8000/api/buildings/")
        if response.status_code == 200:
            buildings = response.json()
            if buildings:
                building_id = buildings[0]['id']
                print(f"✅ Found building: {buildings[0]['name']} (ID: {building_id})")
            else:
                print("❌ No buildings found")
                return
        else:
            print(f"❌ Failed to get buildings: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Error getting buildings: {e}")
        return
    
    # Step 3: Create request with photos
    print("\n3. Creating request with photos...")
    
    # Check if test image exists
    test_image_path = "test_image.svg"
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        return
    
    # Prepare form data
    form_data = {
        'title': 'Test Request with Photos',
        'description': 'This is a test request to verify photo upload functionality. The photos should appear in the detail page.',
        'building': str(building_id),
        'type': 'technical',
        'location': 'parking',
        'is_urgent': 'false'
    }
    
    # Prepare files
    files = {
        'photos': ('test_image.svg', open(test_image_path, 'rb'), 'image/svg+xml')
    }
    
    try:
        response = session.post("http://localhost:8000/api/user-requests/", data=form_data, files=files)
        if response.status_code == 201:
            request_data = response.json()
            request_id = request_data['id']
            print(f"✅ Request created successfully!")
            print(f"   Request ID: {request_id}")
            print(f"   Title: {request_data['title']}")
            print(f"   Photos: {len(request_data.get('photos', []))} uploaded")
            
            # Step 4: Verify photos
            print(f"\n4. Verifying photos in request {request_id}...")
            response = session.get(f"http://localhost:8000/api/user-requests/{request_id}/")
            if response.status_code == 200:
                request_detail = response.json()
                photos = request_detail.get('photos', [])
                print(f"✅ Request retrieved successfully")
                print(f"   Photos found: {len(photos)}")
                for i, photo in enumerate(photos):
                    print(f"   Photo {i+1}: {photo}")
                
                print(f"\n🎉 Test completed successfully!")
                print(f"   View the request at: http://localhost:8080/requests/{request_id}")
                print(f"   Photos should be visible in the detail page")
            else:
                print(f"❌ Failed to retrieve request: {response.status_code}")
        else:
            print(f"❌ Failed to create request: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error creating request: {e}")
    finally:
        files['photos'][1].close()

if __name__ == "__main__":
    test_photos() 