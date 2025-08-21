#!/usr/bin/env python3
"""
Script to test the API response directly
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

def test_api_response():
    """Test the API response directly"""
    
    building_id = 4  # Αλκμάνος 22
    
    print("🔍 ΕΛΕΓΧΟΣ API RESPONSE")
    print("=" * 60)
    print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
    print()
    
    # 1. Test the financial dashboard API
    print("📊 1. ΕΛΕΓΧΟΣ FINANCIAL DASHBOARD API")
    print("-" * 50)
    
    try:
        # Test the API endpoint that the frontend calls
        url = f"http://localhost:8000/api/financial/dashboard/summary/?building_id={building_id}"
        
        print(f"🌐 Calling API: {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Check specific values
            current_obligations = data.get('current_obligations', 0)
            current_reserve = data.get('current_reserve', 0)
            reserve_fund_goal = data.get('reserve_fund_goal', 0)
            reserve_fund_monthly_target = data.get('reserve_fund_monthly_target', 0)
            
            print(f"\n🔍 Key Values:")
            print(f"   current_obligations: {current_obligations}")
            print(f"   current_reserve: {current_reserve}")
            print(f"   reserve_fund_goal: {reserve_fund_goal}")
            print(f"   reserve_fund_monthly_target: {reserve_fund_monthly_target}")
            
            if current_obligations != 0:
                print(f"⚠️  current_obligations is {current_obligations} instead of 0!")
            else:
                print("✅ current_obligations is correct (0)")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")
    
    print()
    
    # 2. Test with different parameters
    print("📊 2. ΕΛΕΓΧΟΣ ΜΕ ΔΙΑΦΟΡΕΤΙΚΕΣ ΠΑΡΑΜΕΤΡΟΥΣ")
    print("-" * 50)
    
    # Test with month parameter
    try:
        url_with_month = f"http://localhost:8000/api/financial/dashboard/summary/?building_id={building_id}&month=2025-08"
        
        print(f"🌐 Calling API with month: {url_with_month}")
        
        response = requests.get(url_with_month, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            current_obligations_month = data.get('current_obligations', 0)
            print(f"✅ current_obligations with month: {current_obligations_month}")
        else:
            print(f"❌ API Error with month: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error calling API with month: {e}")
    
    print()
    
    # 3. Test without parameters
    print("📊 3. ΕΛΕΓΧΟΣ ΧΩΡΙΣ ΠΑΡΑΜΕΤΡΟΥΣ")
    print("-" * 50)
    
    try:
        url_no_params = "http://localhost:8000/api/financial/dashboard/summary/"
        
        print(f"🌐 Calling API without parameters: {url_no_params}")
        
        response = requests.get(url_no_params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response (no params):")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ API Error (no params): {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error calling API without params: {e}")
    
    print()
    print("=" * 60)
    print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    test_api_response()


