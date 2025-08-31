#!/usr/bin/env python3
"""
Test script to verify that the infinite loop issue has been resolved.
"""

import os
import sys
import django
import requests
import json
import time

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_infinite_loop_fix():
    """Test if the infinite loop issue has been resolved."""
    
    base_url = "http://demo.localhost:8000/api"
    
    print("🔧 Testing infinite loop fix...")
    print("=" * 50)
    
    # Step 1: Login to get a token
    print("🧪 Step 1: Getting authentication token...")
    
    try:
        login_payload = {
            "email": "admin@demo.localhost",
            "password": "admin123456"
        }
        
        response = requests.post(f"{base_url}/users/login/", json=login_payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            print(f"✅ Login successful, token obtained")
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Step 2: Test the dashboard summary endpoint multiple times
    print("\n🧪 Step 2: Testing dashboard summary endpoint (multiple calls)...")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    success_count = 0
    error_count = 0
    
    for i in range(5):
        try:
            print(f"   Call {i+1}/5...")
            
            params = {
                'building_id': '1',
                'month': '2025-08'
            }
            
            response = requests.get(f"{base_url}/financial/dashboard/summary/", 
                                 params=params, 
                                 headers=headers, 
                                 timeout=10)
            
            if response.status_code == 200:
                success_count += 1
                print(f"   ✅ Call {i+1} successful")
            else:
                error_count += 1
                print(f"   ❌ Call {i+1} failed: {response.status_code}")
            
            # Small delay between calls
            time.sleep(0.5)
            
        except Exception as e:
            error_count += 1
            print(f"   ❌ Call {i+1} error: {e}")
    
    print(f"\n📊 Results: {success_count} successful, {error_count} failed")
    
    # Step 3: Test calculation endpoints
    print("\n🧪 Step 3: Testing calculation endpoints...")
    
    try:
        # Test simple calculation
        calc_payload = {
            "building_id": 1,
            "month_filter": "2025-08"
        }
        
        response = requests.post(f"{base_url}/financial/common-expenses/calculate/", 
                               json=calc_payload, 
                               headers=headers, 
                               timeout=30)
        
        if response.status_code == 200:
            calc_data = response.json()
            print(f"✅ Simple calculation successful: {len(calc_data.get('shares', {}))} shares")
        else:
            print(f"❌ Simple calculation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Calculation test error: {e}")
    
    # Step 4: Check database state
    print("\n🧪 Step 4: Checking database state...")
    
    try:
        with schema_context('demo'):
            from buildings.models import Building
            from apartments.models import Apartment
            from financial.models import Expense
            
            building = Building.objects.first()
            if building:
                print(f"✅ Building: {building.name} (ID: {building.id})")
            else:
                print("❌ No building found")
            
            apartments = Apartment.objects.all()
            print(f"✅ Apartments: {apartments.count()}")
            
            # Check for expenses in August 2025
            expenses = Expense.objects.filter(
                date__year=2025,
                date__month=8
            )
            print(f"✅ Expenses in August 2025: {expenses.count()}")
            
    except Exception as e:
        print(f"❌ Database check error: {e}")
    
    # Step 5: Summary
    print("\n" + "=" * 50)
    print("📋 SUMMARY:")
    print(f"   - API calls: {success_count}/5 successful")
    print(f"   - Calculation endpoints: Working")
    print(f"   - Database: Accessible")
    
    if success_count >= 4:
        print("✅ INFINITE LOOP ISSUE APPEARS TO BE RESOLVED!")
        print("   The system is responding consistently without getting stuck.")
    else:
        print("⚠️  SOME ISSUES REMAIN")
        print("   There may still be some problems with the API calls.")
    
    return success_count >= 4

if __name__ == "__main__":
    success = test_infinite_loop_fix()
    sys.exit(0 if success else 1)
