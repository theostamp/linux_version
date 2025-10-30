#!/usr/bin/env python3
"""
Test script to verify the API is working correctly.
This tests both direct backend access and Vercel proxy.
"""

import requests
import json
import sys

# Configuration
BACKEND_URL = "https://linuxversion-production.up.railway.app"
VERCEL_URL = "https://linux-version.vercel.app"

def test_backend_direct():
    """Test direct backend access."""
    print("🔍 Testing direct backend access...")
    
    # Test CORS preflight
    headers = {
        "Origin": "https://linux-version.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    }
    
    try:
        response = requests.options(f"{BACKEND_URL}/api/users/login/", headers=headers, timeout=30)
        print(f"CORS preflight status: {response.status_code}")
        print(f"CORS headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ CORS preflight successful!")
        else:
            print(f"❌ CORS preflight failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False
    
    # Test login endpoint
    data = {
        "email": "etherm2021@gmail.com",
        "password": "test_password"  # You'll need to provide the actual password
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://linux-version.vercel.app"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/api/users/login/", json=data, headers=headers, timeout=30)
        print(f"Login status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Direct backend login successful!")
            return True
        else:
            print(f"❌ Direct backend login failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Direct backend test failed: {e}")
        return False

def test_vercel_proxy():
    """Test Vercel proxy access."""
    print("\n🔍 Testing Vercel proxy access...")
    
    # Test login through Vercel proxy
    data = {
        "email": "etherm2021@gmail.com",
        "password": "test_password"  # You'll need to provide the actual password
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        response = requests.post(f"{VERCEL_URL}/api/users/login/", json=data, headers=headers, timeout=30)
        print(f"Vercel proxy login status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Vercel proxy login successful!")
            return True
        else:
            print(f"❌ Vercel proxy login failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error text: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Vercel proxy test failed: {e}")
        return False

def test_health():
    """Test backend health."""
    print("\n🔍 Testing backend health...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health/", timeout=30)
        print(f"Health check status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Backend is healthy!")
            return True
        else:
            print(f"❌ Backend health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 API Testing Suite")
    print("=" * 50)
    
    # Test health first
    health_ok = test_health()
    
    # Test direct backend
    backend_ok = test_backend_direct()
    
    # Test Vercel proxy
    vercel_ok = test_vercel_proxy()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Health Check: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Direct Backend: {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"Vercel Proxy: {'✅ PASS' if vercel_ok else '❌ FAIL'}")
    
    if not (health_ok and backend_ok and vercel_ok):
        sys.exit(1)
    else:
        print("🎉 All tests passed!")

