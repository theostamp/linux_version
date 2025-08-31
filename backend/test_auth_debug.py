#!/usr/bin/env python3
"""
Test script to check user authentication and token handling.
"""

import os
import sys
import django
import requests
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_user_authentication():
    """Test user authentication and token generation."""
    
    base_url = "http://demo.localhost:8000/api"
    
    print("🔐 Testing user authentication...")
    print("=" * 50)
    
    # Test 1: Login with admin user
    print("🧪 Test 1: Login with admin user...")
    
    try:
        login_payload = {
            "email": "admin@demo.localhost",
            "password": "admin123456"
        }
        print(f"📤 Sending login request...")
        print(f"📤 Payload: {json.dumps(login_payload, indent=2)}")
        
        response = requests.post(f"{base_url}/users/login/", json=login_payload, timeout=30)
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            refresh_token = data.get('refresh')
            
            print(f"✅ Login successful!")
            print(f"   - Access token: {access_token[:20]}...{access_token[-10:] if access_token else 'None'}")
            print(f"   - Refresh token: {refresh_token[:20]}...{refresh_token[-10:] if refresh_token else 'None'}")
            
            # Test 2: Use the token to access protected endpoint
            print("\n🧪 Test 2: Testing protected endpoint with token...")
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Test the calculation endpoint with authentication
            calc_payload = {
                "building_id": 1,
                "month_filter": "2025-06"
            }
            
            print(f"📤 Sending authenticated calculation request...")
            print(f"📤 Headers: {json.dumps({k: v[:50] + '...' if len(str(v)) > 50 else v for k, v in headers.items()}, indent=2)}")
            print(f"📤 Payload: {json.dumps(calc_payload, indent=2)}")
            
            calc_response = requests.post(f"{base_url}/financial/common-expenses/calculate/", 
                                        json=calc_payload, 
                                        headers=headers, 
                                        timeout=30)
            
            print(f"📥 Response status: {calc_response.status_code}")
            
            if calc_response.status_code == 200:
                calc_data = calc_response.json()
                print(f"✅ Authenticated calculation successful!")
                print(f"   - Shares count: {len(calc_data.get('shares', {}))}")
                print(f"   - Total expenses: {calc_data.get('total_expenses', 0)}")
            else:
                print(f"❌ Authenticated calculation failed: {calc_response.status_code}")
                print(f"📥 Response body: {calc_response.text}")
                
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"📥 Response body: {response.text}")
            
    except Exception as e:
        print(f"❌ Authentication test error: {e}")
    
    print()
    
    # Test 3: Check user in database
    print("🧪 Test 3: Checking user in database...")
    
    try:
        with schema_context('demo'):
            from users.models import CustomUser
            
            users = CustomUser.objects.all()
            print(f"✅ Users found: {users.count()}")
            
            for user in users:
                print(f"   - {user.email} (ID: {user.id})")
                print(f"     Active: {user.is_active}")
                print(f"     Staff: {user.is_staff}")
                print(f"     Superuser: {user.is_superuser}")
            
    except Exception as e:
        print(f"❌ Database check error: {e}")

if __name__ == "__main__":
    test_user_authentication()
