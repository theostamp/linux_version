#!/usr/bin/env python3
"""
Test script to verify authentication is working on the backend.
This script tests the login endpoint directly.
"""

import requests
import json
import sys

# Configuration
BACKEND_URL = "https://linuxversion-production.up.railway.app"
LOGIN_URL = f"{BACKEND_URL}/api/users/login/"

# Test credentials
TEST_EMAIL = "etherm2021@gmail.com"
TEST_PASSWORD = "test_password"  # You'll need to provide the actual password

def test_login():
    """Test the login endpoint directly."""
    print(f"Testing login endpoint: {LOGIN_URL}")
    
    # Test data
    data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        print(f"Sending POST request with data: {data}")
        response = requests.post(LOGIN_URL, json=data, headers=headers, timeout=30)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response data: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response text: {response.text}")
            
        if response.status_code == 200:
            print("✅ Login successful!")
            return True
        else:
            print(f"❌ Login failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_cors():
    """Test CORS headers."""
    print(f"\nTesting CORS for Vercel domain...")
    
    headers = {
        "Origin": "https://linux-version.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    }
    
    try:
        response = requests.options(LOGIN_URL, headers=headers, timeout=30)
        print(f"CORS preflight status: {response.status_code}")
        print(f"CORS headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ CORS preflight successful!")
            return True
        else:
            print(f"❌ CORS preflight failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ CORS test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Backend Authentication")
    print("=" * 50)
    
    # Test CORS first
    cors_ok = test_cors()
    
    # Test login
    login_ok = test_login()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"CORS: {'✅ PASS' if cors_ok else '❌ FAIL'}")
    print(f"Login: {'✅ PASS' if login_ok else '❌ FAIL'}")
    
    if not cors_ok or not login_ok:
        sys.exit(1)
    else:
        print("🎉 All tests passed!")


