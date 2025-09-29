#!/usr/bin/env python3
"""
Comprehensive Kiosk System Test
"""

import requests
import json
import time

def test_all_systems():
    """Test all kiosk systems"""
    
    print("🚀 Comprehensive Kiosk System Test")
    print("=" * 60)
    
    results = {
        'backend_api': False,
        'public_info': False,
        'weather_api': False,
        'kiosk_config': False
    }
    
    # Test 1: Backend Kiosk Config API
    print("\n1️⃣ Testing Backend Kiosk Config API")
    try:
        url = "http://localhost:18000/api/kiosk/public/configs/get_by_building/?building_id=1"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Kiosk config API working")
            print(f"   📊 Building: {data.get('building', 'N/A')}")
            print(f"   🧩 Widgets: {len(data.get('widgets', []))}")
            print(f"   ⚙️ Settings: {data.get('settings', {})}")
            results['kiosk_config'] = True
        else:
            print(f"   ❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Public Info API
    print("\n2️⃣ Testing Public Info API")
    try:
        url = "http://localhost:18000/api/public-info/1/"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Public info API working")
            print(f"   📢 Announcements: {len(data.get('announcements', []))}")
            print(f"   🗳️ Votes: {len(data.get('votes', []))}")
            print(f"   🏢 Building: {data.get('building_info', {}).get('name', 'N/A')}")
            results['public_info'] = True
        else:
            print(f"   ❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Weather API
    print("\n3️⃣ Testing Weather API")
    try:
        lat, lon = 37.9838, 23.7275  # Athens
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Europe%2FAthens"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            current = data.get('current', {})
            print(f"   ✅ Weather API working")
            print(f"   🌡️ Temperature: {current.get('temperature_2m', 'N/A')}°C")
            print(f"   💧 Humidity: {current.get('relative_humidity_2m', 'N/A')}%")
            print(f"   ☁️ Weather Code: {current.get('weather_code', 'N/A')}")
            results['weather_api'] = True
        else:
            print(f"   ❌ Failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Backend Health
    print("\n4️⃣ Testing Backend Health")
    try:
        url = "http://localhost:18000/health/"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            print(f"   ✅ Backend health check passed")
            results['backend_api'] = True
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n🎯 Overall Score: {passed_tests}/{total_tests} ({(passed_tests/total_tests)*100:.1f}%)")
    
    if passed_tests == total_tests:
        print("🎉 ALL SYSTEMS OPERATIONAL!")
        print("🚀 Kiosk is ready for production!")
    else:
        print("⚠️ Some systems need attention")
    
    return results

if __name__ == "__main__":
    test_all_systems()
